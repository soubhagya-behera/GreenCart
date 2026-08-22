package com.example.greencart.service;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.event.DeliveryUpdateEvent;
import com.example.greencart.exception.ConflictException;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.repository.OrderRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeliveryServiceTest {

    private OrderRepository orderRepo;

    private SimpMessagingTemplate messagingTemplate;

    private DeliveryService service;

    private User partner;
    private User otherPartner;
    private User customer;

    @BeforeEach
    void setUp() {
        orderRepo = mock(OrderRepository.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        service = new DeliveryService(orderRepo, messagingTemplate);

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
        verify(messagingTemplate).convertAndSend(
                eq("/topic/delivery"), any(DeliveryUpdateEvent.class));
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
    }

    @Test
    void markDelivered_onlinePaid_remainsPaid() {

        Order o = order(21L, "OutForDelivery", "UPI", "Paid");
        o.setAssignedDelivery(partner);

        when(orderRepo.save(o)).thenReturn(o);

        Order result = service.markDelivered(o);

        assertEquals("Delivered", result.getOrderStatus());
        assertEquals("Paid", result.getPaymentStatus());
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
    }
}
