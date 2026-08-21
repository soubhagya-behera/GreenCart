package com.example.greencart.security;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderItem;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;
import com.example.greencart.util.AccessGuard;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccessGuardTest {

    private User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    private Product product(User seller) {
        Product p = new Product();
        p.setSeller(seller);
        return p;
    }

    private Order orderWith(List<Product> products) {
        Order o = new Order();
        List<OrderItem> items = new ArrayList<>();
        for (Product p : products) {
            OrderItem i = new OrderItem();
            i.setProduct(p);
            items.add(i);
        }
        o.setItems(items);
        return o;
    }

    @Test
    void sellerCanManageOwnProduct() {
        User a = user(1L, "seller");
        assertTrue(AccessGuard.canManageProduct(a, product(a)));
    }

    @Test
    void sellerCannotManageAnotherSellersProduct() {
        User a = user(1L, "seller");
        User b = user(2L, "seller");
        assertFalse(AccessGuard.canManageProduct(a, product(b)));
    }

    @Test
    void adminCanManageAnyProduct() {
        User admin = user(3L, "admin");
        User b = user(2L, "seller");
        assertTrue(AccessGuard.canManageProduct(admin, product(b)));
    }

    @Test
    void normalCustomerCannotManageProducts() {
        User c = user(4L, "user");
        User b = user(2L, "seller");
        assertFalse(AccessGuard.canManageProduct(c, product(b)));
        assertFalse(AccessGuard.canManageProduct(c, product(c)));
    }

    @Test
    void productWithoutSellerOnlyManagedByAdmin() {
        User admin = user(3L, "admin");
        User a = user(1L, "seller");
        Product orphan = new Product();
        orphan.setSeller(null);
        assertTrue(AccessGuard.canManageProduct(admin, orphan));
        assertFalse(AccessGuard.canManageProduct(a, orphan));
    }

    @Test
    void mixedOrderContainsBothSellersItems() {
        User a = user(1L, "seller");
        User b = user(2L, "seller");
        Order o = orderWith(List.of(product(a), product(b)));
        assertTrue(AccessGuard.orderContainsSellerItems(o, a));
        assertTrue(AccessGuard.orderContainsSellerItems(o, b));
    }

    @Test
    void sellerHasNoItemsInOtherSellersOrder() {
        User a = user(1L, "seller");
        User b = user(2L, "seller");
        Order o = orderWith(List.of(product(b), product(b)));
        assertFalse(AccessGuard.orderContainsSellerItems(o, a));
    }

    @Test
    void onlyAssignedDeliveryOrAdminCanManageLogistics() {
        Order o = new Order();

        User admin = user(9L, "admin");
        User customer = user(4L, "user");
        User assigned = user(5L, "delivery");
        User otherDelivery = user(6L, "delivery");

        o.setAssignedDelivery(assigned);

        assertTrue(AccessGuard.canManageLogistics(admin, o));
        assertTrue(AccessGuard.canManageLogistics(assigned, o));
        assertFalse(AccessGuard.canManageLogistics(otherDelivery, o));
        assertFalse(AccessGuard.canManageLogistics(customer, o));

        o.setAssignedDelivery(null);
        assertFalse(AccessGuard.canManageLogistics(assigned, o));
    }

    @Test
    void roleChecksAreCaseInsensitiveAndNullSafe() {
        assertTrue(AccessGuard.isAdmin(user(1L, "ADMIN")));
        assertTrue(AccessGuard.hasAnyRole(user(1L, "Seller"), "seller", "admin"));
        assertFalse(AccessGuard.hasAnyRole(null, "admin"));
        assertFalse(AccessGuard.hasAnyRole(user(1L, null), "admin"));
    }
}
