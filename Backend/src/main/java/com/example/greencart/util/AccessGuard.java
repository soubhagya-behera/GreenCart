package com.example.greencart.util;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderItem;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;
import com.example.greencart.exception.ForbiddenException;

public final class AccessGuard {

    private AccessGuard() {
    }

    public static boolean isAdmin(User user) {
        return hasAnyRole(user, "admin");
    }

    public static boolean hasAnyRole(User user, String... roles) {
        if (user == null || roles == null || user.getRole() == null) {
            return false;
        }
        for (String role : roles) {
            if (user.getRole().equalsIgnoreCase(role)) {
                return true;
            }
        }
        return false;
    }

    // Pure ID-ownership of a product, independent of role.
    public static boolean isProductOwnedBy(Product product, User user) {
        return product != null
                && user != null
                && user.getId() != null
                && product.getSeller() != null
                && product.getSeller().getId() != null
                && user.getId().equals(product.getSeller().getId());
    }

    // Admin: platform-wide. Seller: only their own listings.
    // Non-seller/non-admin users are denied regardless of ownership.
    public static boolean canManageProduct(User actor, Product product) {
        if (actor == null || product == null) {
            return false;
        }
        if (!hasAnyRole(actor, "seller", "admin")) {
            return false;
        }
        if (isAdmin(actor)) {
            return true;
        }
        return isProductOwnedBy(product, actor);
    }

    public static boolean orderContainsSellerItems(Order order, User seller) {
        if (order == null || seller == null || seller.getId() == null
                || order.getItems() == null) {
            return false;
        }
        for (OrderItem item : order.getItems()) {
            Product product = item != null ? item.getProduct() : null;
            if (product != null
                    && product.getSeller() != null
                    && seller.getId().equals(product.getSeller().getId())) {
                return true;
            }
        }
        return false;
    }

    // Pure ID-based check that the actor is the customer of the order,
    // independent of role.
    public static boolean isOrderCustomer(User actor, Order order) {
        return actor != null
                && order != null
                && actor.getId() != null
                && order.getUser() != null
                && order.getUser().getId() != null
                && actor.getId().equals(order.getUser().getId());
    }

    // Logistics workflow (pick/deliver/otp/notes/proof):
    // admin platform-wide, otherwise only the assigned delivery partner.
    public static boolean canManageLogistics(User actor, Order order) {
        if (actor == null || order == null) {
            return false;
        }
        if (isAdmin(actor)) {
            return true;
        }
        if (!hasAnyRole(actor, "delivery")) {
            return false;
        }
        return order.getAssignedDelivery() != null
                && actor.getId() != null
                && actor.getId().equals(order.getAssignedDelivery().getId());
    }

    public static void require(boolean allowed, String message) {
        if (!allowed) {
            throw new ForbiddenException(message);
        }
    }
}
