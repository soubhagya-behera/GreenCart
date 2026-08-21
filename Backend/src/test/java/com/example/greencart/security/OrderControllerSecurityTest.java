package com.example.greencart.security;

import com.example.greencart.controller.OrderController;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.exception.ForbiddenException;

import com.example.greencart.repository.CartItemRepository;
import com.example.greencart.repository.CartRepository;
import com.example.greencart.repository.OrderItemRepository;
import com.example.greencart.repository.OrderRepository;
import com.example.greencart.repository.ProductRepository;
import com.example.greencart.service.FileUploadService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrderControllerSecurityTest {

    private OrderRepository repo;
    private CartRepository cartRepo;
    private CartItemRepository itemRepo;
    private OrderItemRepository orderItemRepo;
    private ProductRepository productRepo;
    private FileUploadService fileUploadService;
    private OrderController controller;

    private final User customer = user(1L, "user");
    private final User otherCustomer = user(2L, "user");
    private final User assignedRider = user(5L, "delivery");
    private final User otherRider = user(6L, "delivery");
    private final User admin = user(9L, "admin");

    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        repo = mock(OrderRepository.class);
        cartRepo = mock(CartRepository.class);
        itemRepo = mock(CartItemRepository.class);
        orderItemRepo = mock(OrderItemRepository.class);
        productRepo = mock(ProductRepository.class);
        fileUploadService = mock(FileUploadService.class);
        controller = new OrderController(
                repo, cartRepo, itemRepo, orderItemRepo,
                productRepo, fileUploadService);
    }

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    private Order orderAssignedToRider() {
        Order o = new Order();
        o.setId(55L);
        o.setUser(otherCustomer);
        o.setAssignedDelivery(assignedRider);
        o.setOrderStatus("Processing");
        return o;
    }

    private void stubOrder(Order o) {
        when(repo.findById(55L)).thenReturn(Optional.of(o));
        when(repo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void customerCannotAcknowledgePickupOfAnotherUsersOrder() {
        stubOrder(orderAssignedToRider());

        assertThrows(ForbiddenException.class,
                () -> controller.ackPick(55L, requestFor(customer)));
    }

    @Test
    void unassignedDeliveryPartnerCannotAcknowledgePickup() {
        stubOrder(orderAssignedToRider());

        assertThrows(ForbiddenException.class,
                () -> controller.ackPick(55L, requestFor(otherRider)));
    }

    @Test
    void assignedDeliveryCanAcknowledgePickupAndDelivery() {
        stubOrder(orderAssignedToRider());

        assertEquals("Picked Up",
                controller.ackPick(55L, requestFor(assignedRider)).getOrderStatus());
        assertEquals("Delivered",
                controller.ackDeliver(55L, Map.of("otp", "1"),
                        requestFor(assignedRider)).getOrderStatus());
    }

    @Test
    void customerCannotMarkOrdersDelivered() {
        stubOrder(orderAssignedToRider());

        assertThrows(ForbiddenException.class, () -> controller.ackDeliver(
                55L, Map.of("otp", "1"), requestFor(customer)));
    }

    @Test
    void customerCannotResendOtpAddNotesOrUploadProofForForeignOrders() throws Exception {
        stubOrder(orderAssignedToRider());

        assertThrows(ForbiddenException.class,
                () -> controller.resendOtp(55L, requestFor(customer)));
        assertThrows(ForbiddenException.class, () -> controller.addNote(
                55L, Map.of("message", "hi"), requestFor(customer)));

        MultipartFile file = mock(MultipartFile.class);
        assertThrows(ForbiddenException.class,
                () -> controller.uploadProof(55L, file, requestFor(customer)));
    }

    @Test
    void adminRetainsPlatformWideLogisticsControl() throws Exception {
        stubOrder(orderAssignedToRider());

        assertEquals("Picked Up",
                controller.ackPick(55L, requestFor(admin)).getOrderStatus());

        var otpResponse = controller.resendOtp(55L, requestFor(admin));
        assertEquals(200, otpResponse.getStatusCode().value());
    }

    @Test
    void readingMyOrdersNeverMutatesProcessingOrdersToDelivered() {
        Order processing = new Order();
        processing.setId(77L);
        processing.setUser(customer);
        processing.setOrderStatus("Processing");
        processing.setCreatedAt(LocalDateTime.now().minusHours(2));

        when(repo.findByUser(customer)).thenReturn(List.of(processing));

        List<Order> result = controller.myOrders(requestFor(customer));

        assertEquals("Processing", result.get(0).getOrderStatus());
        verify(repo, never()).save(any(Order.class));
    }
}
