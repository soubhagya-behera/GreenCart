package com.example.greencart.service;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.repository.OrderRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Verifies the demo auto-delivery scheduler targets ONLY accepted,
// in-flight orders that matured ~1 minute after acceptance. Unassigned or
// freshly accepted orders must never be delivered.
class DemoOrderAutoDeliveryServiceTest {

    private OrderRepository orderRepo;

    private DeliveryService deliveryService;

    private DemoOrderAutoDeliveryService scheduler;

    private User partner;

    @BeforeEach
    void setUp() {
        orderRepo = mock(OrderRepository.class);
        deliveryService = mock(DeliveryService.class);
        scheduler = new DemoOrderAutoDeliveryService(orderRepo, deliveryService);

        partner = new User();
        partner.setId(5L);
        partner.setRole("delivery");
    }

    private Order order(Long id, String status, LocalDateTime assignedAt) {
        Order o = new Order();
        o.setId(id);
        o.setOrderStatus(status);
        o.setAssignedDelivery(partner);
        o.setAssignedAt(assignedAt);
        o.setCreatedAt(LocalDateTime.now().minusMinutes(30));
        return o;
    }

    @Test
    void deliversOnlyMaturedAcceptedOrders() {

        LocalDateTime matured = LocalDateTime.now().minusMinutes(2);

        Order readyOutForDelivery =
                order(1L, "OutForDelivery", matured);

        Order freshPickup =
                order(2L, "Picked Up", LocalDateTime.now());

        Order notYetAcceptedStatus =
                order(3L, "Processing", matured);

        when(orderRepo.findByAssignedDeliveryIsNotNullAndDeliveredAtIsNull())
                .thenReturn(List.of(readyOutForDelivery, freshPickup, notYetAcceptedStatus));

        scheduler.autoDeliverMaturedOrders();

        verify(deliveryService).markDelivered(readyOutForDelivery);
        verify(deliveryService, never()).markDelivered(freshPickup);
        verify(deliveryService, never()).markDelivered(notYetAcceptedStatus);
    }

    @Test
    void cancelledOrder_neverDelivered() {

        Order cancelled =
                order(4L, "Cancelled", LocalDateTime.now().minusMinutes(5));

        when(orderRepo.findByAssignedDeliveryIsNotNullAndDeliveredAtIsNull())
                .thenReturn(List.of(cancelled));

        scheduler.autoDeliverMaturedOrders();

        verify(deliveryService, never()).markDelivered(any());
    }
}
