package com.example.greencart.security;

import com.example.greencart.controller.SellerController;
import com.example.greencart.dto.SellerOrderDTO;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderItem;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;
import com.example.greencart.exception.ForbiddenException;

import com.example.greencart.repository.OrderRepository;
import com.example.greencart.repository.ProductRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SellerControllerSecurityTest {

    private OrderRepository orderRepo;
    private ProductRepository productRepo;
    private SellerController controller;

    private final User sellerA = user(1L, "seller");
    private final User sellerB = user(2L, "seller");
    private final User customer = user(3L, "user");
    private final User admin = user(9L, "admin");

    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        orderRepo = mock(OrderRepository.class);
        productRepo = mock(ProductRepository.class);
        controller = new SellerController(orderRepo, productRepo);
    }

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    private Product productOf(User seller, long id) {
        Product p = new Product();
        p.setId(id);
        p.setSeller(seller);
        return p;
    }

    private Order orderOf(OrderItem... items) {
        Order o = new Order();
        o.setId(55L);
        o.setItems(List.of(items));
        return o;
    }

    private OrderItem item(Product product, int qty, double price) {
        OrderItem i = new OrderItem();
        i.setProduct(product);
        i.setQty(qty);
        i.setPrice(price);
        return i;
    }

    @Test
    void sellerACannotUpdateStatusOfSellersBOrder() {
        Order bOnly = orderOf(item(productOf(sellerB, 22L), 1, 10.0));
        when(orderRepo.findById(55L)).thenReturn(Optional.of(bOnly));

        assertThrows(ForbiddenException.class, () -> controller.updateStatus(
                55L, Map.of("status", "Delivered"), requestFor(sellerA)));
    }

    @Test
    void sellerACannotAssignDeliveryOnSellersBOrder() {
        Order bOnly = orderOf(item(productOf(sellerB, 22L), 1, 10.0));
        when(orderRepo.findById(55L)).thenReturn(Optional.of(bOnly));

        assertThrows(ForbiddenException.class, () -> controller.assignDelivery(
                55L, Map.of("deliveryEmail", "d@x.com"), requestFor(sellerA)));
    }

    @Test
    void sellerCanStillManageOwnOrderStatus() {
        Order mixed = orderOf(
                item(productOf(sellerA, 11L), 2, 50.0),
                item(productOf(sellerB, 22L), 1, 10.0));
        when(orderRepo.findById(55L)).thenReturn(Optional.of(mixed));
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Order result = controller.updateStatus(
                55L, Map.of("status", "Packed"), requestFor(sellerA));

        assertEquals("Packed", result.getOrderStatus());
    }

    @Test
    void normalCustomerCannotUseSellerOrderEndpoints() {
        Order bOnly = orderOf(item(productOf(sellerB, 22L), 1, 10.0));
        when(orderRepo.findById(55L)).thenReturn(Optional.of(bOnly));

        assertThrows(RuntimeException.class, () -> controller.updateStatus(
                55L, Map.of("status", "Delivered"), requestFor(customer)));
        assertThrows(RuntimeException.class,
                () -> controller.sellerOrders(requestFor(customer)));
    }

    @Test
    void adminRetainsPlatformWideOrderControl() {
        Order bOnly = orderOf(item(productOf(sellerB, 22L), 1, 10.0));
        when(orderRepo.findById(55L)).thenReturn(Optional.of(bOnly));
        when(orderRepo.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Order result = controller.updateStatus(
                55L, Map.of("status", "Cancelled"), requestFor(admin));

        assertEquals("Cancelled", result.getOrderStatus());
    }

    @Test
    void sellerOrderListIsScopedToOwnItems() {
        Order mixed = orderOf(
                item(productOf(sellerA, 11L), 2, 50.0),
                item(productOf(sellerB, 22L), 3, 100.0));
        Order bOnly = orderOf(item(productOf(sellerB, 33L), 1, 5.0));
        when(orderRepo.findAll()).thenReturn(List.of(mixed, bOnly));

        List<SellerOrderDTO> result =
                controller.sellerOrders(requestFor(sellerA));

        assertEquals(1, result.size());
        assertEquals(1, result.get(0).getItems().size());
        assertEquals(11L, result.get(0).getItems().get(0).getProductId());
        assertEquals(100.0, result.get(0).getTotal());
    }
}
