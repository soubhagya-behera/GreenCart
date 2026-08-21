package com.example.greencart.security;

import com.example.greencart.controller.AdminController;
import com.example.greencart.controller.CouponController;
import com.example.greencart.dto.AdminOrderDTO;
import com.example.greencart.dto.AnalyticsDTO;
import com.example.greencart.entity.Coupon;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderItem;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;

import com.example.greencart.repository.CouponRepository;
import com.example.greencart.repository.OrderRepository;
import com.example.greencart.repository.ProductRepository;
import com.example.greencart.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminControllerPhase1Test {

    private UserRepository userRepo;
    private ProductRepository productRepo;
    private OrderRepository orderRepo;
    private CouponRepository couponRepo;
    private AdminController controller;

    private final User admin = user(9L, "admin");
    private final User sellerA = user(1L, "seller");
    private final User sellerB = user(2L, "seller");

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        userRepo = mock(UserRepository.class);
        productRepo = mock(ProductRepository.class);
        orderRepo = mock(OrderRepository.class);
        couponRepo = mock(CouponRepository.class);
        controller = new AdminController(
                userRepo, productRepo, orderRepo, couponRepo);
    }

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    @Test
    void sellerCannotAccessAdminEndpoints() {
        assertThrows(Exception.class,
                () -> controller.allUsers(null, requestFor(sellerA)));
        assertThrows(Exception.class,
                () -> controller.allProducts(requestFor(sellerA)));
        assertThrows(Exception.class,
                () -> controller.allOrders(requestFor(sellerA)));
        assertThrows(Exception.class,
                () -> controller.analytics(requestFor(sellerA)));
        assertThrows(Exception.class,
                () -> controller.changeRole(1L,
                        Map.of("role", "user"), requestFor(sellerA)));
        assertThrows(Exception.class,
                () -> controller.changeOrderStatus(55L,
                        Map.of("status", "Delivered"), requestFor(sellerA)));
    }

    @Test
    void adminAnalyticsIsPlatformWideAndPaidOnly() {

        when(userRepo.count()).thenReturn(7L);
        when(productRepo.count()).thenReturn(11L);
        when(orderRepo.count()).thenReturn(4L);

        Order paidFromSellerA = new Order();
        paidFromSellerA.setPaymentStatus("Paid");
        paidFromSellerA.setTotal(250.0);

        Order paidFromSellerB = new Order();
        paidFromSellerB.setPaymentStatus("Paid");
        paidFromSellerB.setTotal(75.0);

        Order unpaid = new Order();
        unpaid.setPaymentStatus("Pending");
        unpaid.setTotal(999.0);

        Order cancelledPaid = new Order();
        cancelledPaid.setPaymentStatus("Paid");
        cancelledPaid.setTotal(50.0);

        // Existing semantics: every Paid order counts, regardless of status.
        when(orderRepo.findAll()).thenReturn(List.of(
                paidFromSellerA, paidFromSellerB, unpaid, cancelledPaid));

        AnalyticsDTO dto = controller.analytics(requestFor(admin));

        assertEquals(7L, dto.getTotalUsers());
        assertEquals(11L, dto.getTotalProducts());
        assertEquals(4L, dto.getTotalOrders());
        assertEquals(375.0, dto.getTotalRevenue());
    }

    @Test
    void adminUsersResponseContainsNoPasswordOrHash() throws Exception {

        User withSecrets = user(1L, "seller");
        withSecrets.setName("A");
        withSecrets.setEmail("a@x.com");
        withSecrets.setStoreName("A Store");
        withSecrets.setPassword("$2a$10$hashedsecretvalue");

        when(userRepo.findAll()).thenReturn(List.of(withSecrets));

        String json = mapper.writeValueAsString(
                controller.allUsers(null, requestFor(admin)));

        assertFalse(json.contains("password"));
        assertFalse(json.contains("hashedsecretvalue"));
        assertTrue(json.contains("\"email\""));
        assertTrue(json.contains("\"role\""));
        assertTrue(json.contains("\"storeName\""));
        assertTrue(json.contains("\"verified\""));
    }

    @Test
    void sellerRoleFilterReturnsOnlySellers() {

        User customer = user(3L, "user");
        User delivery = user(4L, "delivery");

        when(userRepo.findAll())
                .thenReturn(List.of(sellerA, sellerB, customer, delivery));

        List<?> sellers = controller.allUsers("seller", requestFor(admin));

        assertEquals(2, sellers.size());
        assertTrue(sellers.stream().allMatch(u ->
                "seller".equalsIgnoreCase(((com.example.greencart.dto.AdminUserDTO) u).getRole())));

        List<?> everyone =
                controller.allUsers(null, requestFor(admin));
        assertEquals(4, everyone.size());

        List<?> sellersIgnoreCase =
                controller.allUsers("SELLER", requestFor(admin));
        assertEquals(2, sellersIgnoreCase.size());
    }

    @Test
    void adminCanUpdateAnyOrderStatusWithValidation() {

        Order order = new Order();
        order.setId(55L);
        order.setOrderStatus("Processing");
        when(orderRepo.findById(55L)).thenReturn(Optional.of(order));
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Legacy spelling is normalized to the canonical value.
        AdminOrderDTO result = controller.changeOrderStatus(
                55L, Map.of("status", "Out for Delivery"), requestFor(admin));
        assertEquals("OutForDelivery", result.getOrderStatus());

        assertThrows(RuntimeException.class, () -> controller.changeOrderStatus(
                55L, Map.of("status", "Teleported"), requestFor(admin)));
    }

    @Test
    void adminCouponsCrudWorks() {

        CouponController couponController =
                new CouponController(couponRepo);

        Coupon coupon = new Coupon();
        coupon.setId(1L);
        coupon.setCode("FRESH10");
        coupon.setDiscountPercent(10.0);
        coupon.setMinAmount(200.0);
        coupon.setActive(true);

        when(couponRepo.findAll()).thenReturn(List.of(coupon));
        List<?> all = couponController.allCoupons(requestFor(admin));
        assertEquals(1, all.size());

        // Non-admins cannot manage coupons
        assertThrows(Exception.class,
                () -> couponController.allCoupons(requestFor(sellerA)));

        when(couponRepo.findById(1L)).thenReturn(Optional.of(coupon));
        when(couponRepo.save(any(Coupon.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Coupon updated = couponController.updateCoupon(
                1L,
                Map.of(
                        "code", "SAVE20",
                        "discountPercent", 20,
                        "minAmount", 100,
                        "active", "false",
                        "expiryDate", LocalDateTime.now().plusDays(5)
                                .withNano(0)
                                .toString()
                ),
                requestFor(admin));

        assertEquals("SAVE20", updated.getCode());
        assertEquals(20.0, updated.getDiscountPercent());
        assertEquals(100.0, updated.getMinAmount());
        assertFalse(updated.getActive());

        when(couponRepo.existsById(1L)).thenReturn(true);
        var response = couponController.deleteCoupon(1L, requestFor(admin));
        assertEquals("Coupon deleted", response.get("message"));
        verify(couponRepo).deleteById(1L);

        when(couponRepo.existsById(2L)).thenReturn(false);
        assertThrows(RuntimeException.class,
                () -> couponController.deleteCoupon(2L, requestFor(admin)));
    }
}
