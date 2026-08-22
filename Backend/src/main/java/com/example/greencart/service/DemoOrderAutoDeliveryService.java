package com.example.greencart.service;

import com.example.greencart.entity.Order;
import com.example.greencart.repository.OrderRepository;
import com.example.greencart.util.OrderStatuses;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

// DEMO AUTOMATION — intentionally NOT production payment logic.
//
// The ONE auto-delivery mechanism for the GreenCart demo. Reworked for the
// delivery-partner flow: an order is only delivered after a delivery
// partner ACCEPTED it. The ~1 minute demo timer is measured from the
// acceptance time (assignedAt; falls back to createdAt for legacy rows),
// not from order creation:
//
//   ORDER CREATED  ->  WAITING FOR PARTNER  ->  ACCEPTED  ->  OUT FOR DELIVERY
//                                                              | (~1 min)
//                                                              v
//                                                          DELIVERED
//
// Completion itself is delegated to DeliveryService.markDelivered(), so the
// payment rules live in exactly one place:
//   - COD + Pending becomes Paid (cash collected at the door);
//   - online orders keep their Razorpay-driven payment state;
//   - unassigned orders are NEVER auto-delivered;
//   - Cancelled orders are never touched.
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
        name = "greencart.demo-auto-delivery.enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class DemoOrderAutoDeliveryService {

    // Demo delay between acceptance and simulated delivery.
    static final long DELIVERY_DELAY_MINUTES = 1;

    private final OrderRepository orderRepo;

    private final DeliveryService deliveryService;

    @Scheduled(initialDelay = 60_000, fixedDelay = 15_000)
    public void autoDeliverMaturedOrders() {

        LocalDateTime cutoff =
                LocalDateTime.now().minusMinutes(DELIVERY_DELAY_MINUTES);

        // Only orders a partner already accepted and that are still in flight.
        List<Order> candidates =
                orderRepo.findByAssignedDeliveryIsNotNullAndDeliveredAtIsNull();

        for (Order order : candidates) {

            String status = OrderStatuses.normalize(order.getOrderStatus());

            // Only accepted, in-flight orders (Picked Up / OutForDelivery).
            // Cancelled orders are never touched; unassigned ones are
            // excluded by the repository query itself.
            if (status == null
                    || !DeliveryService.IN_FLIGHT_STATUSES.contains(status)) {
                continue;
            }

            LocalDateTime acceptedAt = order.getAssignedAt() != null
                    ? order.getAssignedAt()
                    : order.getCreatedAt();

            if (acceptedAt == null || acceptedAt.isAfter(cutoff)) {
                continue;
            }

            deliveryService.markDelivered(order);
        }
    }
}
