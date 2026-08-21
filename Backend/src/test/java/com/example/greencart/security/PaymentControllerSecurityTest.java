package com.example.greencart.security;

import com.example.greencart.controller.PaymentController;
import com.example.greencart.dto.PaymentVerifyDTO;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;
import com.example.greencart.repository.OrderRepository;
import com.example.greencart.service.RazorpayService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PaymentControllerSecurityTest {

    private RazorpayService razorpayService;
    private OrderRepository orderRepo;
    private PaymentController controller;

    private final User customerA = user(1L, "user");
    private final User customerB = user(2L, "user");
    private final User seller = user(3L, "seller");
    private final User admin = user(9L, "admin");

    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        razorpayService = mock(RazorpayService.class);
        orderRepo = mock(OrderRepository.class);
        controller = new PaymentController(razorpayService, orderRepo);
    }

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    private Order orderOwnedBy(User owner, long id) {
        Order o = new Order();
        o.setId(id);
        o.setUser(owner);
        o.setOrderStatus("Awaiting Payment");
        o.setPaymentStatus("Pending");
        return o;
    }

    private PaymentVerifyDTO payload(long orderId) {
        PaymentVerifyDTO dto = new PaymentVerifyDTO();
        dto.setOrderId(orderId);
        dto.setRazorpayOrderId("order_x");
        dto.setRazorpayPaymentId("pay_x");
        dto.setRazorpaySignature("sig_x");
        return dto;
    }

    @Test
    void unauthenticatedVerificationIsRejected() {
        when(orderRepo.findById(55L))
                .thenReturn(Optional.of(orderOwnedBy(customerB, 55L)));

        assertThrows(UnauthorizedException.class,
                () -> controller.verifyPayment(payload(55L), requestFor(null)));
    }

    @Test
    void customerACannotVerifyCustomerBsOrder() {
        when(orderRepo.findById(55L))
                .thenReturn(Optional.of(orderOwnedBy(customerB, 55L)));

        assertThrows(ForbiddenException.class,
                () -> controller.verifyPayment(payload(55L), requestFor(customerA)));

        // Signature processing must not even run for foreign orders.
        verifyNoInteractions(razorpayService);
        verify(orderRepo, never()).save(any());
    }

    @Test
    void customerCanVerifyOwnLegitimateOrder() throws Exception {
        Order own = orderOwnedBy(customerA, 66L);
        when(orderRepo.findById(66L)).thenReturn(Optional.of(own));
        when(razorpayService.verifyPayment(any(), any(), any())).thenReturn(true);
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        controller.verifyPayment(payload(66L), requestFor(customerA));

        assertEquals("Paid", own.getPaymentStatus());
        assertEquals("Confirmed", own.getOrderStatus());
        verify(orderRepo).save(own);
    }

    @Test
    void sellerCannotVerifyAnotherCustomersOrder() {
        when(orderRepo.findById(55L))
                .thenReturn(Optional.of(orderOwnedBy(customerB, 55L)));

        assertThrows(ForbiddenException.class,
                () -> controller.verifyPayment(payload(55L), requestFor(seller)));

        verifyNoInteractions(razorpayService);
    }

    @Test
    void adminRetainsPlatformWideVerificationControl() throws Exception {
        Order foreign = orderOwnedBy(customerB, 55L);
        when(orderRepo.findById(55L)).thenReturn(Optional.of(foreign));
        when(razorpayService.verifyPayment(any(), any(), any())).thenReturn(true);
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        controller.verifyPayment(payload(55L), requestFor(admin));

        assertEquals("Paid", foreign.getPaymentStatus());
    }

    @Test
    void invalidSignatureRemainsRejectedEvenForOwner() throws Exception {
        Order own = orderOwnedBy(customerA, 66L);
        when(orderRepo.findById(66L)).thenReturn(Optional.of(own));
        when(razorpayService.verifyPayment(any(), any(), any())).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> controller.verifyPayment(payload(66L), requestFor(customerA)));

        assertEquals("Invalid payment signature", ex.getMessage());
        assertEquals("Pending", own.getPaymentStatus());
        verify(orderRepo, never()).save(any());
    }

    // ---- create-order integrity ----

    private Order pricedOrder(User owner, long id, double total) {
        Order o = orderOwnedBy(owner, id);
        o.setTotal(total);
        return o;
    }

    @Test
    void unauthenticatedPaymentOrderCreationIsRejected() {
        when(orderRepo.findById(66L))
                .thenReturn(Optional.of(pricedOrder(customerA, 66L, 499.5)));

        assertThrows(UnauthorizedException.class,
                () -> controller.createOrder(66L, requestFor(null)));
    }

    @Test
    void customerACannotCreatePaymentFromCustomerBsOrder() {
        when(orderRepo.findById(55L))
                .thenReturn(Optional.of(pricedOrder(customerB, 55L, 999.0)));

        assertThrows(ForbiddenException.class,
                () -> controller.createOrder(55L, requestFor(customerA)));

        verifyNoInteractions(razorpayService);
    }

    @Test
    void sellerCannotCreatePaymentFromAnotherCustomersOrder() {
        when(orderRepo.findById(55L))
                .thenReturn(Optional.of(pricedOrder(customerB, 55L, 999.0)));

        assertThrows(ForbiddenException.class,
                () -> controller.createOrder(55L, requestFor(seller)));

        verifyNoInteractions(razorpayService);
    }

    @Test
    void serverChargesExactlyTheStoredOrderTotal() throws Exception {
        // The client no longer sends an amount at all; whatever it once sent
        // is structurally ignored. Razorpay must receive the stored total.
        Order own = pricedOrder(customerA, 66L, 499.5);
        when(orderRepo.findById(66L)).thenReturn(Optional.of(own));
        when(razorpayService.createOrder(499.5))
                .thenReturn("{\"id\":\"order_1\",\"amount\":49950,\"currency\":\"INR\"}");

        var response = controller.createOrder(66L, requestFor(customerA));

        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> body =
                (java.util.Map<String, Object>) response.getBody();
        assertEquals("order_1", body.get("id"));
        assertEquals(49950, body.get("amount"));   // paise, from Razorpay itself
        assertEquals("INR", body.get("currency"));
        verify(razorpayService).createOrder(499.5);
    }

    @Test
    void eachOrderChargesItsOwnServerSideTotal() throws Exception {
        Order cheap = pricedOrder(customerA, 1L, 100.0);
        Order pricey = pricedOrder(customerA, 2L, 999.0);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(cheap));
        when(orderRepo.findById(2L)).thenReturn(Optional.of(pricey));
        when(razorpayService.createOrder(any(Double.class))).thenReturn("{}");

        controller.createOrder(1L, requestFor(customerA));
        controller.createOrder(2L, requestFor(customerA));

        verify(razorpayService).createOrder(100.0);
        verify(razorpayService).createOrder(999.0);
    }

    @Test
    void ordersWithoutValidTotalAreRejected() {
        Order free = pricedOrder(customerA, 3L, 0.0);
        Order nullTotal = orderOwnedBy(customerA, 4L);
        when(orderRepo.findById(3L)).thenReturn(Optional.of(free));
        when(orderRepo.findById(4L)).thenReturn(Optional.of(nullTotal));

        assertThrows(RuntimeException.class,
                () -> controller.createOrder(3L, requestFor(customerA)));
        assertThrows(RuntimeException.class,
                () -> controller.createOrder(4L, requestFor(customerA)));

        verifyNoInteractions(razorpayService);
    }
}
