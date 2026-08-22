package com.example.greencart.service;

import com.example.greencart.dto.DeliveryOverviewDTO;
import com.example.greencart.dto.DeliveryRequestDTO;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.event.DeliveryUpdateEvent;
import com.example.greencart.repository.OrderRepository;
import com.example.greencart.util.AccessGuard;
import com.example.greencart.util.OrderStatuses;
import com.example.greencart.exception.ConflictException;
import com.example.greencart.exception.ForbiddenException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

// Single source of truth for the delivery lifecycle.
//
//   ORDER CREATED (checkout)  -> notifyNewRequest()
//   PARTNER ACCEPTS           -> accept()          [atomic claim]
//   OUT FOR DELIVERY
//   DELIVERED                 -> markDelivered()   [scheduler OR manual]
//
// markDelivered is the ONLY completion implementation; the demo scheduler
// and any manual endpoint both delegate here, so payment rules can never
// diverge between paths.
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryService {

    public static final String TOPIC = "/topic/delivery";

    // Statuses an unassigned order can be accepted in: payment flow has
    // started (COD checkout or verified UPI) and it is not terminal.
    public static final Set<String> CLAIMABLE_STATUSES = Set.of(
            OrderStatuses.CONFIRMED,
            OrderStatuses.PROCESSING,
            OrderStatuses.PACKED,
            OrderStatuses.SHIPPED
    );

    // Accepted but not yet completed.
    public static final Set<String> IN_FLIGHT_STATUSES = Set.of(
            OrderStatuses.PICKED_UP,
            OrderStatuses.OUT_FOR_DELIVERY
    );

    private final OrderRepository orderRepo;

    private final SimpMessagingTemplate messagingTemplate;

    // ---- READS -----------------------------------------------------------

    // Unassigned orders waiting for a partner, oldest first.
    public List<DeliveryRequestDTO> availableRequests() {

        return orderRepo.findByAssignedDeliveryIsNull().stream()
                .filter(o -> o.getDeliveredAt() == null)
                .filter(o -> CLAIMABLE_STATUSES.contains(
                        OrderStatuses.normalize(o.getOrderStatus())))
                .sorted(Comparator.comparing(Order::getCreatedAt))
                .map(DeliveryRequestDTO::from)
                .toList();
    }

    // All orders assigned to this partner (active + history), newest first.
    public List<Order> myOrders(User partner) {

        return orderRepo.findByAssignedDelivery(partner).stream()
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .toList();
    }

    public DeliveryOverviewDTO overview(User partner) {

        LocalDate today = LocalDate.now();

        LocalDateTime dayStart = today.atStartOfDay();

        LocalDateTime dayEnd = today.plusDays(1).atStartOfDay();

        long completedToday =
                orderRepo.countByAssignedDeliveryAndDeliveredAtBetween(
                        partner, dayStart, dayEnd);

        double deliveredValueToday =
                orderRepo.findByAssignedDelivery(partner).stream()

                        .filter(o -> o.getDeliveredAt() != null)

                        .filter(o -> !o.getDeliveredAt().isBefore(dayStart)
                                && o.getDeliveredAt().isBefore(dayEnd))

                        .mapToDouble(o ->
                                o.getTotal() != null ? o.getTotal() : 0)

                        .sum();

        return new DeliveryOverviewDTO(
                partner.isOnline(),
                availableRequests().size(),
                orderRepo.countByAssignedDeliveryAndOrderStatusIn(
                        partner, IN_FLIGHT_STATUSES),
                completedToday,
                Math.round(deliveredValueToday * 100.0) / 100.0
        );
    }

    // ---- LIFECYCLE -------------------------------------------------------

    // Atomically assign an order to this delivery partner.
    //
    // The assignment itself is one guarded UPDATE inside one transaction:
    // when two partners accept at the same moment only the first UPDATE
    // matches; the loser gets 0 rows and a 409 Conflict response.
    @Transactional
    public Order accept(User partner, Long orderId) {

        AccessGuard.require(
                AccessGuard.hasAnyRole(partner, "delivery"),
                "Only delivery partners can accept orders"
        );

        if (!partner.isOnline()) {
            throw new ForbiddenException(
                    "Go online to accept delivery requests"
            );
        }

        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String current = OrderStatuses.normalize(order.getOrderStatus());

        if (OrderStatuses.CANCELLED.equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled orders cannot be assigned");
        }

        if (OrderStatuses.DELIVERED.equalsIgnoreCase(current)) {
            throw new RuntimeException("Order is already delivered");
        }

        if ("Awaiting Payment".equalsIgnoreCase(current)) {
            throw new RuntimeException("Order payment has not been confirmed yet");
        }

        if (current == null || !CLAIMABLE_STATUSES.contains(current)) {
            throw new RuntimeException(
                    "Order is not available for acceptance (status: "
                            + order.getOrderStatus() + ")");
        }

        int claimed = orderRepo.claimOrder(
                orderId,
                partner,
                LocalDateTime.now(),
                CLAIMABLE_STATUSES
        );

        if (claimed == 0) {
            // Lost the race or state changed concurrently — explain precisely.
            Order fresh = orderRepo.findById(orderId).orElse(null);

            if (fresh != null && fresh.getAssignedDelivery() != null
                    && !partner.getId().equals(fresh.getAssignedDelivery().getId())) {
                throw new ConflictException(
                        "Order already assigned to another delivery partner");
            }

            throw new RuntimeException(
                    "Order can no longer be accepted");
        }

        // Persistence context was cleared by the modifying query, so this
        // findById reads the post-claim database state.
        Order assigned = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        assigned.setOrderStatus(OrderStatuses.OUT_FOR_DELIVERY);

        Order saved = orderRepo.save(assigned);

        publish("ACCEPTED", saved);

        log.info("[DELIVERY] Order #{} accepted by partner {} ({})",
                saved.getId(), partner.getName(), partner.getEmail());

        return saved;
    }

    // The ONLY order-completion implementation. Used by the demo auto-delivery
    // scheduler and by any manual "mark delivered" endpoint, so the COD
    // collection rule lives in exactly one place:
    //   COD + Pending  -> Delivered -> Paid      (cash collected at door)
    //   Online + Paid  -> Delivered -> stays Paid
    //   Online + Pending -> Delivered -> stays Pending
    //   Cancelled / already Delivered orders are never touched.
    @Transactional
    public Order markDelivered(Order order) {

        if (order == null) {
            return null;
        }

        String status = order.getOrderStatus();

        if (status == null
                || OrderStatuses.DELIVERED.equalsIgnoreCase(status)
                || OrderStatuses.CANCELLED.equalsIgnoreCase(status)) {
            return order;
        }

        boolean codCollected =
                "COD".equalsIgnoreCase(order.getPaymentMethod())
                        && !"Paid".equalsIgnoreCase(order.getPaymentStatus());

        if (codCollected) {
            order.setPaymentStatus("Paid");
        }

        order.setOrderStatus(OrderStatuses.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());

        Order saved = orderRepo.save(order);

        publish("DELIVERED", saved);

        log.info("[DELIVERY] Order #{} marked Delivered by partner{}",
                saved.getId(),
                codCollected ? " · COD payment collected" : "");

        return saved;
    }

    // Checkout calls this after creating a deliverable order so partner
    // dashboards light up without polling/refresh.
    public void notifyNewRequest(Order order) {

        if (order == null) {
            return;
        }

        publish("NEW_REQUEST", order);
    }

    // ---- EVENTS ----------------------------------------------------------

    public void publish(String type, Order order) {

        if (order == null || order.getId() == null) {
            return;
        }

        try {
            messagingTemplate.convertAndSend(
                    TOPIC,
                    new DeliveryUpdateEvent(
                            type,
                            order.getId(),
                            order.getOrderStatus(),
                            order.getPaymentStatus(),
                            order.getTotal(),
                            order.getPaymentMethod()
                    )
            );
        } catch (Exception e) {
            // Real-time push must never break the business transaction;
            // clients also poll as a fallback.
            log.warn("[DELIVERY] Failed to publish {} event for order #{}: {}",
                    type, order.getId(), e.getMessage());
        }
    }
}
