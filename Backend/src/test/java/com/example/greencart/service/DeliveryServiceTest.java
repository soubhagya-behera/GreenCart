package com.example.greencart.service;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderRejection;
import com.example.greencart.entity.User;
import com.example.greencart.event.DeliveryUpdateEvent;
import com.example.greencart.exception.ConflictException;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.repository.OrderRejectionRepository;
import com.example.greencart.repository.OrderRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeliveryServiceTest {

    private OrderRepository orderRepo;

    private OrderRejectionRepository rejectionRepo;

    private OrderEventPublisher eventPublisher;

    private DeliveryService service;

    private User partner;
    private User otherPartner;
    private User customer;

    @BeforeEach
    void setUp() {
        orderRepo = mock(OrderRepository.class);
        rejectionRepo = mock(OrderRejectionRepository.class);
        eventPublisher = mock(OrderEventPublisher.class);
        service = new DeliveryService(orderRepo, rejectionRepo, eventPublisher);

        partner = user(5L, "delivery");
        partner.setOnline(true);
        otherPartner = user(6L, "delivery");
        otherPartner.setOnline(true);
        customer = user(10L, "user");

        // Echo-save: return the same instance the service hands us.
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        u.setName("User " + id);
        return u;
    }

    private Order order(Long id, String status, String paymentMethod, String paymentStatus) {
        Order o = new Order();
        o.setId(id);
        o.setUser(customer);
        o.setOrderStatus(status);
        o.setPaymentMethod(paymentMethod);
        o.setPaymentStatus(paymentStatus);
        o.setTotal(220.0);
        o.setCreatedAt(LocalDateTime.now().minusMinutes(10));
        return o;
    }

    // ---- ACCEPT ----------------------------------------------------------

    @Test
    void accept_success_assignsPartnerAndSetsOutForDelivery() {

        Order processing = order(7L, "Processing", "COD", "Pending");

        when(orderRepo.findById(7L)).thenReturn(Optional.of(processing));
        when(orderRepo.claimOrder(eq(7L), eq(partner), any(), anyCollection()))
                .thenReturn(1);

        Order result = service.accept(partner, 7L);

        assertEquals("OutForDelivery", result.getOrderStatus());
        verify(orderRepo).claimOrder(
                eq(7L), eq(partner), any(LocalDateTime.class),
                eq(DeliveryService.CLAIMABLE_STATUSES));
        verify(eventPublisher).publish("ACCEPTED", result);
    }

    @Test
    void accept_simultaneousClaim_onlyOneWinsOtherGetsConflict() {

        // Partner A and B both validate against the same claimable order
        // (both reads happen before either commits), then the atomic UPDATE
        // lets exactly one of them match a row.
        Order initialSnapshot = order(8L, "Confirmed", "COD", "Pending");

        Order staleSnapshot = order(8L, "Confirmed", "COD", "Pending");

        Order claimed = order(8L, "OutForDelivery", "COD", "Pending");
        claimed.setAssignedDelivery(otherPartner);

        // Read order: A validates -> A reloads after winning -> B validates
        // (stale snapshot) -> B reloads after losing.
        when(orderRepo.findById(8L)).thenReturn(
                Optional.of(initialSnapshot),
                Optional.of(claimed),
                Optional.of(staleSnapshot),
                Optional.of(claimed));

        when(orderRepo.claimOrder(eq(8L), eq(otherPartner), any(), anyCollection()))
                .thenReturn(1);

        when(orderRepo.claimOrder(eq(8L), eq(partner), any(), anyCollection()))
                .thenReturn(0);

        // First partner wins cleanly.
        try {
            service.accept(otherPartner, 8L);
        } catch (Exception e) {
            throw new AssertionError("First assign should succeed", e);
        }

        // Second partner loses: 0 rows matched -> precise conflict response.
        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> service.accept(partner, 8L));

        assertEquals("Order already assigned to another delivery partner",
                ex.getMessage());
    }

    @Test
    void accept_offlinePartner_rejected() {

        partner.setOnline(false);

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> service.accept(partner, 9L));

        assertEquals("Go online to accept delivery requests", ex.getMessage());
        verify(orderRepo, never()).claimOrder(any(), any(), any(), anyCollection());
    }

    @Test
    void accept_nonDeliveryRole_rejected() {

        User plainUser = user(11L, "user");

        assertThrows(ForbiddenException.class,
                () -> service.accept(plainUser, 7L));
    }

    @Test
    void accept_cancelledOrder_rejected() {

        when(orderRepo.findById(12L))
                .thenReturn(Optional.of(order(12L, "Cancelled", "COD", "Pending")));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.accept(partner, 12L));

        assertEquals("Cancelled orders cannot be assigned", ex.getMessage());
    }

    @Test
    void awaitPaymentOrder_cannotBeAssigned() {

        when(orderRepo.findById(13L))
                .thenReturn(Optional.of(order(13L, "Awaiting Payment", "UPI", "Pending")));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.accept(partner, 13L));

        assertEquals("Order payment has not been confirmed yet", ex.getMessage());
    }

    // ---- MARK DELIVERED (payment rules) ----------------------------------

    @Test
    void markDelivered_codPending_becomesPaidAndStamped() {

        Order o = order(20L, "OutForDelivery", "COD", "Pending");
        o.setAssignedDelivery(partner);

        when(orderRepo.save(o)).thenReturn(o);

        Order result = service.markDelivered(o);

        assertEquals("Delivered", result.getOrderStatus());
        assertEquals("Paid", result.getPaymentStatus());
        assertNotNull(result.getDeliveredAt());

        // Completion + COD collection are both pushed in order.
        var inOrder = Mockito.inOrder(eventPublisher);
        inOrder.verify(eventPublisher).publish("ORDER_COMPLETED", result);
        inOrder.verify(eventPublisher).publish("PAYMENT_STATUS_CHANGED", result);
    }

    @Test
    void markDelivered_onlinePaid_remainsPaid() {

        Order o = order(21L, "OutForDelivery", "UPI", "Paid");
        o.setAssignedDelivery(partner);

        when(orderRepo.save(o)).thenReturn(o);

        Order result = service.markDelivered(o);

        assertEquals("Delivered", result.getOrderStatus());
        assertEquals("Paid", result.getPaymentStatus());

        // Payment status did not flip: no PAYMENT_STATUS_CHANGED event.
        verify(eventPublisher).publish("ORDER_COMPLETED", result);
        verify(eventPublisher, never())
                .publish(eq("PAYMENT_STATUS_CHANGED"), any(Order.class));
    }

    @Test
    void markDelivered_onlinePending_staysPending() {

        Order o = order(22L, "OutForDelivery", "UPI", "Pending");
        o.setAssignedDelivery(partner);

        when(orderRepo.save(o)).thenReturn(o);

        Order result = service.markDelivered(o);

        assertEquals("Delivered", result.getOrderStatus());
        assertEquals("Pending", result.getPaymentStatus());
    }

    @Test
    void markDelivered_cancelled_neverTouched() {

        Order o = order(23L, "Cancelled", "COD", "Pending");

        Order result = service.markDelivered(o);

        assertSame(o, result);
        assertEquals("Cancelled", result.getOrderStatus());
        assertNull(result.getDeliveredAt());
        verify(orderRepo, never()).save(o);
        verify(eventPublisher, never()).publish(any(), any(Order.class));
    }

    // ---- EVENT PAYLOADS --------------------------------------------------

    @Test
    void acceptEvent_carriesPartnerAndAssignmentInfo() {

        Order initial = order(30L, "Processing", "COD", "Pending");

        Order claimed = order(30L, "Processing", "COD", "Pending");
        claimed.setAssignedDelivery(partner);
        claimed.setAssignedAt(LocalDateTime.now());

        // First read validates, second read happens after the atomic claim.
        when(orderRepo.findById(30L)).thenReturn(
                Optional.of(initial),
                Optional.of(claimed));
        when(orderRepo.claimOrder(eq(30L), eq(partner), any(), anyCollection()))
                .thenReturn(1);

        service.accept(partner, 30L);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(eventPublisher).publish(eq("ACCEPTED"), captor.capture());

        Order eventOrder = captor.getValue();
        assertEquals(partner.getId(), eventOrder.getAssignedDelivery().getId());
        assertNotNull(eventOrder.getAssignedAt());
        assertEquals("OutForDelivery", eventOrder.getOrderStatus());
    }

    @Test
    void notifyNewRequest_publishesNewRequestType() {

        Order o = order(31L, "Processing", "COD", "Pending");

        service.notifyNewRequest(o);

        verify(eventPublisher).publish("NEW_REQUEST", o);
        verify(eventPublisher, times(1)).publish(any(), any(Order.class));
    }

    // ---- REJECT ----------------------------------------------------------

    @Test
    void reject_success_recordsRejectionAndPublishesPartnerScopedEvent() {

        Order processing = order(40L, "Processing", "COD", "Pending");
        when(orderRepo.findById(40L)).thenReturn(Optional.of(processing));
        when(rejectionRepo.existsByOrderIdAndPartnerId(40L, 5L)).thenReturn(false);

        service.reject(partner, 40L);

        ArgumentCaptor<OrderRejection> saved =
                ArgumentCaptor.forClass(OrderRejection.class);
        verify(rejectionRepo).save(saved.capture());
        assertEquals(40L, saved.getValue().getOrderId());
        assertEquals(5L, saved.getValue().getPartnerId());
        assertNotNull(saved.getValue().getRejectedAt());

        // Event is scoped to the rejecting partner and carries NO customer
        // routing — other partners and the customer are untouched.
        ArgumentCaptor<DeliveryUpdateEvent> events =
                ArgumentCaptor.forClass(DeliveryUpdateEvent.class);
        verify(eventPublisher).publish(events.capture());
        DeliveryUpdateEvent event = events.getValue();
        assertEquals("DELIVERY_REJECTED", event.type());
        assertEquals(40L, event.orderId());
        assertEquals(5L, event.partnerId());
        assertNull(event.customerEmail());
    }

    @Test
    void reject_isIdempotent_noDuplicateRowsOnSecondReject() {

        Order processing = order(41L, "Processing", "COD", "Pending");
        when(orderRepo.findById(41L)).thenReturn(Optional.of(processing));
        when(rejectionRepo.existsByOrderIdAndPartnerId(41L, 5L)).thenReturn(true);

        service.reject(partner, 41L);

        verify(rejectionRepo, never()).save(any(OrderRejection.class));
        verify(eventPublisher, never()).publish(any(DeliveryUpdateEvent.class));
    }

    @Test
    void reject_assignedToOther_conflict() {

        Order claimed = order(42L, "OutForDelivery", "COD", "Pending");
        claimed.setAssignedDelivery(otherPartner);
        when(orderRepo.findById(42L)).thenReturn(Optional.of(claimed));

        ConflictException ex = assertThrows(
                ConflictException.class, () -> service.reject(partner, 42L));

        assertEquals("Order already assigned to another delivery partner",
                ex.getMessage());
        verify(rejectionRepo, never()).save(any(OrderRejection.class));
    }

    @Test
    void reject_ownAcceptedOrder_forbidden() {

        Order mine = order(43L, "OutForDelivery", "COD", "Pending");
        mine.setAssignedDelivery(partner);
        when(orderRepo.findById(43L)).thenReturn(Optional.of(mine));

        RuntimeException ex = assertThrows(
                RuntimeException.class, () -> service.reject(partner, 43L));

        assertEquals("You already accepted this order — reject is not possible",
                ex.getMessage());
        verify(rejectionRepo, never()).save(any(OrderRejection.class));
    }

    @Test
    void reject_cancelledOrDelivered_noop() {

        when(orderRepo.findById(44L)).thenReturn(
                Optional.of(order(44L, "Cancelled", "COD", "Pending")));
        when(orderRepo.findById(45L)).thenReturn(
                Optional.of(order(45L, "Delivered", "UPI", "Paid")));

        service.reject(partner, 44L);
        service.reject(partner, 45L);

        verify(rejectionRepo, never()).save(any(OrderRejection.class));
        verify(eventPublisher, never()).publish(any(DeliveryUpdateEvent.class));
    }

    @Test
    void reject_nonDeliveryRole_rejected() {

        User plainUser = user(12L, "user");

        assertThrows(ForbiddenException.class,
                () -> service.reject(plainUser, 7L));
    }

    // ---- REQUEST LIST (partner-aware) -------------------------------------

    @Test
    void availableRequests_hidesOnlyThisPartnersRejections() {

        Order rejectedByMe = order(50L, "Processing", "COD", "Pending");
        rejectedByMe.setId(50L);
        Order fresh = order(51L, "Confirmed", "UPI", "Paid");
        fresh.setId(51L);

        when(orderRepo.findByAssignedDeliveryIsNull())
                .thenReturn(List.of(rejectedByMe, fresh));

        // Partner 5 rejected order #50 only.
        OrderRejection rejection = new OrderRejection(null, 50L, 5L, LocalDateTime.now());
        when(rejectionRepo.findByPartnerId(5L)).thenReturn(List.of(rejection));
        when(rejectionRepo.findByPartnerId(6L)).thenReturn(List.of());

        var forMe = service.availableRequests(partner);
        var forOther = service.availableRequests(otherPartner);

        assertEquals(1, forMe.size());
        assertEquals(51L, forMe.get(0).getId());

        assertEquals(2, forOther.size());
    }

    // ---- ACCEPT cleans up rejections --------------------------------------

    @Test
    void accept_success_clearsStaleRejectionsForTheOrder() {

        Order processing = order(60L, "Processing", "COD", "Pending");

        when(orderRepo.findById(60L)).thenReturn(Optional.of(processing));
        when(orderRepo.claimOrder(eq(60L), eq(partner), any(), anyCollection()))
                .thenReturn(1);

        service.accept(partner, 60L);

        verify(rejectionRepo).deleteByOrderId(60L);
    }

    @Test
    void accept_lostRace_doesNotClearRejections() {

        Order stale = order(61L, "Processing", "COD", "Pending");
        Order claimed = order(61L, "OutForDelivery", "COD", "Pending");
        claimed.setAssignedDelivery(otherPartner);

        when(orderRepo.findById(61L)).thenReturn(
                Optional.of(stale), Optional.of(claimed));
        when(orderRepo.claimOrder(eq(61L), eq(partner), any(), anyCollection()))
                .thenReturn(0);

        assertThrows(ConflictException.class, () -> service.accept(partner, 61L));

        verify(rejectionRepo, never()).deleteByOrderId(anyLong());
    }
}
