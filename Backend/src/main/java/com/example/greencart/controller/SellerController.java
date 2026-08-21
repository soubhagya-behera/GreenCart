package com.example.greencart.controller;

import com.example.greencart.dto.SellerAnalyticsDTO;
import com.example.greencart.dto.SellerOrderDTO;
import com.example.greencart.entity.*;
import com.example.greencart.repository.*;

import com.example.greencart.util.AccessGuard;
import com.example.greencart.util.OrderStatuses;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/seller")
public class SellerController {

    private final OrderRepository orderRepo;

    private final ProductRepository productRepo;


    // GET SELLER ORDERS (scoped: only this seller's own line items)
    @GetMapping("/orders")
    public List<SellerOrderDTO> sellerOrders(
            HttpServletRequest req
    ) {

        User seller =
                (User) req.getAttribute("user");

        if (seller == null) {

            throw new UnauthorizedException();
        }

        AccessGuard.require(
                AccessGuard.hasAnyRole(seller, "seller", "admin"),
                "Access denied"
        );

        List<Order> allOrders =
                orderRepo.findAll();

        return SellerOrderDTO.fromOrders(allOrders, seller);
    }

    // SELLER ANALYTICS
    // Revenue = sum(item.price * item.qty) over this seller's own items
    // in orders that are Paid and not Cancelled. Order.total is never
    // used here because it spans other sellers' goods in the same cart.
    @GetMapping("/analytics")
    public SellerAnalyticsDTO analytics(
            HttpServletRequest req
    ) {

        User seller =
                (User) req.getAttribute("user");

        if (seller == null) {

            throw new UnauthorizedException();
        }

        AccessGuard.require(
                AccessGuard.hasAnyRole(seller, "seller", "admin"),
                "Access denied"
        );

        double totalRevenue = 0;

        long totalOrders = 0;
        long pendingOrders = 0;
        long completedOrders = 0;

        Map<Long, SellerAnalyticsDTO.TopProduct> topByProduct =
                new HashMap<>();

        List<Order> allOrders = orderRepo.findAll();

        for (Order order : allOrders) {

            String status = order.getOrderStatus();

            if (OrderStatuses.CANCELLED.equalsIgnoreCase(status)) {
                continue;
            }

            boolean paid = "Paid".equalsIgnoreCase(order.getPaymentStatus());

            boolean hasOwnItem = false;

            if (order.getItems() != null) {

                for (OrderItem item : order.getItems()) {

                    Product product = item.getProduct();

                    if (!AccessGuard.isProductOwnedBy(product, seller)) {
                        continue;
                    }

                    hasOwnItem = true;

                    if (paid && item.getPrice() != null) {

                        double lineRevenue =
                                item.getPrice() * item.getQty();

                        totalRevenue += lineRevenue;

                        SellerAnalyticsDTO.TopProduct top =
                                topByProduct.computeIfAbsent(
                                        product.getId(),
                                        id -> new SellerAnalyticsDTO.TopProduct(
                                                id,
                                                product.getName(),
                                                product.getImageUrl(),
                                                0L,
                                                0.0
                                        )
                                );

                        top.setQtySold(top.getQtySold() + item.getQty());
                        top.setRevenue(top.getRevenue() + lineRevenue);
                    }
                }
            }

            if (!hasOwnItem) {
                continue;
            }

            totalOrders++;

            if (OrderStatuses.DELIVERED.equalsIgnoreCase(status)) {
                completedOrders++;
            } else {
                pendingOrders++;
            }
        }

        long activeProducts = productRepo.findBySeller(seller)
                .stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .count();

        List<SellerAnalyticsDTO.TopProduct> topProducts =
                new ArrayList<>(topByProduct.values());

        topProducts.sort(
                Comparator.comparingDouble(
                        SellerAnalyticsDTO.TopProduct::getRevenue
                ).reversed()
        );

        List<SellerAnalyticsDTO.TopProduct> limited =
                topProducts.size() > 5
                        ? topProducts.subList(0, 5)
                        : topProducts;

        return new SellerAnalyticsDTO(
                Math.round(totalRevenue * 100.0) / 100.0,
                totalOrders,
                pendingOrders,
                completedOrders,
                activeProducts,
                limited
        );
    }

    // UPDATE ORDER STATUS
    @PutMapping("/orders/{id}/status")
    public Order updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest req
    ) {

        User seller =
                (User) req.getAttribute("user");

        if (seller == null) {

            throw new UnauthorizedException();
        }

        AccessGuard.require(
                AccessGuard.hasAnyRole(seller, "seller", "admin"),
                "Access denied"
        );

        Order order = orderRepo.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Order not found"
                        )
                );

        AccessGuard.require(
                AccessGuard.isAdmin(seller)
                        || AccessGuard.orderContainsSellerItems(order, seller),
                "You can only update orders that contain your products"
        );

        String normalized = OrderStatuses.normalize(body.get("status"));

        if (normalized == null) {
            throw new RuntimeException("Invalid status");
        }

        order.setOrderStatus(normalized);

        return orderRepo.save(order);
    }

    @PutMapping("/orders/{id}/assign")
    public Order assignDelivery(
        @PathVariable Long id,
        @RequestBody Map<String, String> body,
        HttpServletRequest req
    ) {
        User seller = (User) req.getAttribute("user");
        if (seller == null) throw new UnauthorizedException();

        AccessGuard.require(
                AccessGuard.hasAnyRole(seller, "seller", "admin"),
                "Access denied"
        );

        Order order = orderRepo.findById(id).orElseThrow();

        AccessGuard.require(
                AccessGuard.isAdmin(seller)
                        || AccessGuard.orderContainsSellerItems(order, seller),
                "You can only manage orders that contain your products"
        );

        // You need UserRepository here — add it to the constructor
        // User delivery = userRepo.findByEmail(body.get("deliveryEmail")).orElseThrow();
        // order.setAssignedDelivery(delivery);
        order.setOrderStatus(OrderStatuses.OUT_FOR_DELIVERY);
        return orderRepo.save(order);
    }
}
