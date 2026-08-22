package com.example.greencart.service;

import com.example.greencart.entity.Order;
import com.example.greencart.repository.OrderRepository;
import com.example.greencart.util.OrderStatuses;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// DEMO AUTOMATION — intentionally NOT production payment logic.
//
// Simulates a fulfilment pipeline for the GreenCart demo: every successfully
// created order becomes Delivered one minute after creation (measured from
// createdAt). When that happens:
//   - orderStatus becomes "Delivered" and deliveredAt is stamped;
//   - a COD order whose payment is still "Pending" becomes "Paid", because
//     the simulated delivery represents cash collection at the door;
//   - online orders keep whatever payment state Razorpay verification gave
//     them (already-Paid stays Paid; never-yet-paid stays Pending);
//   - Cancelled orders are never touched.
//
// This replaces the old side effect (removed in c57919d) where GET
// /orders/my silently mutated orders during reads. No read endpoint
// mutates anything; this is the only auto-delivery mechanism.
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
        name = "greencart.demo-auto-delivery.enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class DemoOrderAutoDeliveryService {

    // Demo delay between order creation and simulated delivery.
    static final long DELIVERY_DELAY_MINUTES = 1;

    private final OrderRepository orderRepo;

    @Scheduled(initialDelay = 60_000, fixedDelay = 15_000)
    @Transactional
    public void autoDeliverMaturedOrders() {

        LocalDateTime cutoff =
                LocalDateTime.now().minusMinutes(DELIVERY_DELAY_MINUTES);

        List<Order> candidates = orderRepo.findAll();

        for (Order order : candidates) {

            String status = order.getOrderStatus();

            if (status == null
                    || OrderStatuses.DELIVERED.equalsIgnoreCase(status)
                    || OrderStatuses.CANCELLED.equalsIgnoreCase(status)) {
                continue;
            }

            if (order.getCreatedAt() == null
                    || order.getCreatedAt().isAfter(cutoff)) {
                continue;
            }

            boolean codCollected =
                    "COD".equalsIgnoreCase(order.getPaymentMethod())
                            && !"Paid".equalsIgnoreCase(order.getPaymentStatus());

            if (codCollected) {
                order.setPaymentStatus("Paid");
            }

            order.setOrderStatus(OrderStatuses.DELIVERED);
            order.setDeliveredAt(LocalDateTime.now());

            orderRepo.save(order);

            log.info("[DEMO] Order #{} auto-delivered after {} min{}",
                    order.getId(),
                    DELIVERY_DELAY_MINUTES,
                    codCollected ? " · COD payment collected" : "");
        }
    }
}
