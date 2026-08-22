package com.example.greencart.service;

import com.example.greencart.entity.Order;
import com.example.greencart.repository.OrderRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DemoOrderAutoDeliveryServiceTest {

    private OrderRepository orderRepo;
    private DemoOrderAutoDeliveryService service;

    @BeforeEach
    void setUp() {
        orderRepo = mock(OrderRepository.class);
        service = new DemoOrderAutoDeliveryService(orderRepo);
    }

    private Order order(Long id, String status, String paymentStatus,
                        String paymentMethod, LocalDateTime createdAt) {
        Order o = new Order();
        o.setId(id);
        o.setOrderStatus(status);
        o.setPaymentStatus(paymentStatus);
        o.setPaymentMethod(paymentMethod);
        o.setCreatedAt(createdAt);
        return o;
    }

    // A. COD Pending → after simulated delivery → Delivered + Paid
    @Test
    void maturedCodPendingOrderBecomesDeliveredAndPaid() {

        Order cod = order(10L, "Processing", "Pending", "COD",
                LocalDateTime.now().minusMinutes(5));

        when(orderRepo.findAll()).thenReturn(List.of(cod));
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.autoDeliverMaturedOrders();

        assertEquals("Delivered", cod.getOrderStatus());
        assertEquals("Paid", cod.getPaymentStatus());
        assertNotNull(cod.getDeliveredAt());
        verify(orderRepo).save(cod);
    }

    // B. Online Paid → simulated delivery → Delivered + stays Paid
    @Test
    void maturedOnlinePaidOrderIsDeliveredWithoutTouchingPayment() {

        Order online = order(11L, "Confirmed", "Paid", "Online",
                LocalDateTime.now().minusMinutes(5));

        when(orderRepo.findAll()).thenReturn(List.of(online));
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.autoDeliverMaturedOrders();

        assertEquals("Delivered", online.getOrderStatus());
        assertEquals("Paid", online.getPaymentStatus());
        assertNotNull(online.getDeliveredAt());
    }

    // B2. Online not-yet-paid keeps its payment state (never fabricated).
    @Test
    void maturedUnpaidOnlineOrderIsDeliveredButStaysPending() {

        Order awaiting = order(12L, "Awaiting Payment", "Pending", "Online",
                LocalDateTime.now().minusMinutes(5));

        when(orderRepo.findAll()).thenReturn(List.of(awaiting));
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.autoDeliverMaturedOrders();

        assertEquals("Delivered", awaiting.getOrderStatus());
        assertEquals("Pending", awaiting.getPaymentStatus());
    }

    // C. Cancelled orders are never delivered or marked Paid.
    @Test
    void cancelledOrdersAreNeverTouched() {

        Order cancelledCod = order(13L, "Cancelled", "Pending", "COD",
                LocalDateTime.now().minusMinutes(30));

        when(orderRepo.findAll()).thenReturn(List.of(cancelledCod));

        service.autoDeliverMaturedOrders();

        assertEquals("Cancelled", cancelledCod.getOrderStatus());
        assertEquals("Pending", cancelledCod.getPaymentStatus());
        assertNull(cancelledCod.getDeliveredAt());
        verify(orderRepo, never()).save(any(Order.class));
    }

    // Orders younger than the 1-minute demo delay are left alone.
    @Test
    void freshOrdersAreNotDeliveredEarly() {

        Order freshCod = order(14L, "Processing", "Pending", "COD",
                LocalDateTime.now().minusSeconds(30));

        when(orderRepo.findAll()).thenReturn(List.of(freshCod));

        service.autoDeliverMaturedOrders();

        assertEquals("Processing", freshCod.getOrderStatus());
        assertNull(freshCod.getDeliveredAt());
        verify(orderRepo, never()).save(any(Order.class));
    }

    // Already-delivered orders are skipped (idempotent reruns).
    @Test
    void alreadyDeliveredOrdersAreSkipped() {

        Order done = order(15L, "Delivered", "Pending", "COD",
                LocalDateTime.now().minusMinutes(30));

        when(orderRepo.findAll()).thenReturn(List.of(done));

        service.autoDeliverMaturedOrders();

        assertEquals("Pending", done.getPaymentStatus());
        verify(orderRepo, never()).save(any(Order.class));
    }
}
