package com.example.greencart.service;

import com.example.greencart.dto.DeliveryOverviewDTO;
import com.example.greencart.dto.DeliveryRequestDTO;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderRejection;
import com.example.greencart.entity.User;
import com.example.greencart.event.DeliveryUpdateEvent;
import com.example.greencart.repository.OrderRejectionRepository;
import com.example.greencart.repository.OrderRepository;
import com.example.greencart.util.AccessGuard;
import com.example.greencart.util.OrderStatuses;
import com.example.greencart.exception.ConflictException;
import com.example.greencart.exception.ForbiddenException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

// Single source of truth for the delivery lifecycle.
//
//   ORDER CREATED (checkout)  -> notifyNewRequest()
//   PARTNER REJECTS           -> reject()          [per-partner hide only]
//   PARTNER ACCEPTS           -> accept()          [atomic claim]
//   OUT FOR DELIVERY
//   DELIVERED                 -> markDelivered()   [scheduler OR manual]
//
// There is exactly ONE delivery job per order: Order.assignedDelivery is the
// single assignment truth and availableRequests() derives from it. Rejections
// only hide an order from ONE partner; they never create jobs and never block
// other partners. markDelivered is the ONLY completion implementation; the
// demo scheduler and any manual endpoint both delegate here, so payment rules
// can never diverge between paths.
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryService {

    public static final String TOPIC = OrderEventPublisher.DELIVERY_TOPIC;

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

    private final OrderRejectionRepository rejectionRepo;

    private final OrderEventPublisher eventPublisher;

    // ---- READS -----------------------------------------------------------

    // Unassigned orders waiting for a partner, oldest first.
    //
    // Partner-aware: orders THIS partner rejected are hidden from them, but
    // stay visible to everyone else. The result is still one logical request
    // per order (derived from the single orders row), never duplicated.
    public List<DeliveryRequestDTO> availableRequests(User partner) {

        Set<Long> rejectedByMe = partner == null || partner.getId() == null
                ? Set.of()
                : rejectionRepo.findByPartnerId(partner.getId()).stream()
                        .map(OrderRejection::getOrderId)
                        .collect(Collectors.toSet());

        return orderRepo.findByAssignedDeliveryIsNull().stream()
                .filter(o -> o.getDeliveredAt() == null)
                .filter(o -> !rejectedByMe.contains(o.getId()))
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
                availableRequests(partner).size(),
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

        // The job is claimed: this partner's rejection rows for it are now
        // meaningless. (deleteByOrderId is a no-op when nothing was rejected.)
        try {
            rejectionRepo.deleteByOrderId(orderId);
        } catch (Exception e) {
            log.warn("[DELIVERY] Could not clear rejections for order #{}: {}",
                    orderId, e.getMessage());
        }

        // Dispatched to clients only after this transaction commits.
        eventPublisher.publish("ACCEPTED", saved);

        log.info("[DELIVERY] Order #{} accepted by partner {} ({})",
                saved.getId(), partner.getName(), partner.getEmail());

        return saved;
    }

    // Record a partner's rejection of an available order.
    //
    // Semantics:
    //   - hides the request from THIS partner only; other partners keep
    //     seeing and accepting it;
    //   - never assigns anything and never starts the delivery timer;
    //   - idempotent: unique(order_id, partner_id) + exists-check make
    //     repeated rejects harmless;
    //   - refuses orders that are already assigned / terminal so the button
    //     can never act on stale state.
    @Transactional
    public void reject(User partner, Long orderId) {

        AccessGuard.require(
                AccessGuard.hasAnyRole(partner, "delivery"),
                "Only delivery partners can reject requests"
        );

        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String current = OrderStatuses.normalize(order.getOrderStatus());

        if (order.getAssignedDelivery() != null) {
            if (partner.getId().equals(order.getAssignedDelivery().getId())) {
                throw new RuntimeException(
                        "You already accepted this order — reject is not possible");
            }
            throw new ConflictException(
                    "Order already assigned to another delivery partner");
        }

        if (OrderStatuses.CANCELLED.equalsIgnoreCase(current)
                || OrderStatuses.DELIVERED.equalsIgnoreCase(current)) {
            // Nothing left to reject; treat as already-gone.
            return;
        }

        if (current == null || !CLAIMABLE_STATUSES.contains(current)) {
            throw new RuntimeException(
                    "Order is not available for rejection (status: "
                            + order.getOrderStatus() + ")");
        }

        Long partnerId = partner.getId();

        boolean newlyRejected = false;

        if (!rejectionRepo.existsByOrderIdAndPartnerId(orderId, partnerId)) {
            try {
                rejectionRepo.save(new OrderRejection(
                        null, orderId, partnerId, LocalDateTime.now()));
                newlyRejected = true;
            } catch (DataIntegrityViolationException e) {
                // Concurrent duplicate reject — the unique constraint makes
                // this safe to ignore.
                log.debug("[DELIVERY] Duplicate reject ignored for order #{} partner #{}",
                        orderId, partnerId);
            }
        }

        if (!newlyRejected) {
            return;
        }

        // Partner-scoped event: carries partnerId so every client can tell
        // WHO rejected. Only that partner removes the card from their queue;
        // other partners' lists are untouched. No customer notification —
        // from the customer's perspective nothing happened.
        eventPublisher.publish(new DeliveryUpdateEvent(
                "DELIVERY_REJECTED",
                order.getId(),
                order.getOrderStatus(),
                order.getPaymentStatus(),
                order.getTotal(),
                order.getPaymentMethod(),
                null, null, null, null,
                null, null,
                partnerId, null));

        log.info("[DELIVERY] Order #{} rejected by partner {} ({})",
                orderId, partner.getName(), partner.getEmail());
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

        String paymentStatusBefore = order.getPaymentStatus();

        if (codCollected) {
            order.setPaymentStatus("Paid");
        }

        order.setOrderStatus(OrderStatuses.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());

        Order saved = orderRepo.save(order);

        eventPublisher.publish("ORDER_COMPLETED", saved);

        if (!Objects.equals(paymentStatusBefore, saved.getPaymentStatus())) {
            eventPublisher.publish("PAYMENT_STATUS_CHANGED", saved);
        }

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

    // Delegates to OrderEventPublisher: the STOMP broadcast happens strictly
    // AFTER the surrounding transaction (if any) commits, so clients never
    // see events for rolled-back work.
    public void publish(String type, Order order) {

        eventPublisher.publish(type, order);
    }
}
