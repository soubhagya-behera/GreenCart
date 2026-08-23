package com.example.greencart.controller;

import com.example.greencart.entity.*;
import com.example.greencart.repository.*;

import com.example.greencart.dto.AdminDeliveryPartnerDTO;
import com.example.greencart.dto.AdminOrderDTO;
import com.example.greencart.dto.AdminUserDTO;
import com.example.greencart.dto.AnalyticsDTO;

import com.example.greencart.util.AccessGuard;
import com.example.greencart.util.OrderStatuses;
import com.example.greencart.service.OrderEventPublisher;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin")
public class AdminController {

    private final UserRepository userRepo;

    private final ProductRepository productRepo;

    private final OrderRepository orderRepo;

    private final CouponRepository couponRepo;

    private final OrderEventPublisher orderEventPublisher;

    // CHECK ADMIN
    private User getAdmin(
            HttpServletRequest req
    ) {

        User admin =
                (User) req.getAttribute("user");

        if (admin == null) {

            throw new UnauthorizedException();
        }

        if (!AccessGuard.isAdmin(admin)) {

            throw new ForbiddenException(
                    "Admin access required"
            );
        }

        return admin;
    }

    // GET ALL USERS (optionally filtered by role, e.g. ?role=seller)
    @GetMapping("/users")
    public List<AdminUserDTO> allUsers(
            @RequestParam(required = false) String role,
            HttpServletRequest req
    ) {

        getAdmin(req);

        List<User> users = userRepo.findAll();

        if (role != null && !role.isBlank()) {

            users = users.stream()
                    .filter(u -> u.getRole() != null
                            && u.getRole().equalsIgnoreCase(role.trim()))
                    .collect(Collectors.toList());
        }

        return users.stream()
                .map(AdminUserDTO::from)
                .collect(Collectors.toList());
    }

    // GET ALL PRODUCTS
    @GetMapping("/products")
    public List<Product> allProducts(
            HttpServletRequest req
    ) {

        getAdmin(req);

        return productRepo.findAll();
    }

    // GET ALL ORDERS (platform-wide)
    @GetMapping("/orders")
    public List<AdminOrderDTO> allOrders(
            HttpServletRequest req
    ) {

        getAdmin(req);

        return orderRepo.findAll().stream()
                .map(AdminOrderDTO::from)
                .collect(Collectors.toList());
    }

    // DELIVERY PARTNERS — roster with real workload figures.
    // Active = orders in Picked Up / OutForDelivery assigned to the partner;
    // completed counts come from deliveredAt stamps.
    @GetMapping("/delivery-partners")
    public List<AdminDeliveryPartnerDTO> deliveryPartners(
            HttpServletRequest req
    ) {

        getAdmin(req);

        LocalDate today = LocalDate.now();

        LocalDateTime dayStart = today.atStartOfDay();

        LocalDateTime dayEnd = today.plusDays(1).atStartOfDay();

        return userRepo.findByRoleIgnoreCase("delivery").stream()
                .map(partner -> {
                    long active = orderRepo.countByAssignedDeliveryAndOrderStatusIn(
                            partner,
                            Set.of(OrderStatuses.PICKED_UP, OrderStatuses.OUT_FOR_DELIVERY));
                    long completed = orderRepo.countByAssignedDeliveryAndDeliveredAtNotNull(partner);
                    long completedToday = orderRepo.countByAssignedDeliveryAndDeliveredAtBetween(
                            partner, dayStart, dayEnd);
                    return AdminDeliveryPartnerDTO.from(partner, active, completed, completedToday);
                })
                .collect(Collectors.toList());
    }

    // CHANGE USER ROLE
    @PutMapping("/users/{id}/role")
    public AdminUserDTO changeRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest req
    ) {

        getAdmin(req);

        Set<String> assignableRoles =
                Set.of("user", "seller", "delivery", "admin");

        String nextRole = body.get("role");

        if (nextRole == null
                || !assignableRoles.contains(nextRole.toLowerCase())) {
            throw new RuntimeException("Invalid role");
        }

        User user = userRepo.findById(id)
                .orElseThrow();

        user.setRole(nextRole);

        return AdminUserDTO.from(userRepo.save(user));
    }

    // UPDATE ANY ORDER STATUS (platform-wide)
    // Transactional + ORDER_STATUS_CHANGED event so every client (customer,
    // delivery partner, admin) updates the moment the change commits.
    @org.springframework.transaction.annotation.Transactional
    @PutMapping("/orders/{id}/status")
    public AdminOrderDTO changeOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest req
    ) {

        getAdmin(req);

        Order order = orderRepo.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Order not found"));

        String normalized = OrderStatuses.normalize(body.get("status"));

        if (normalized == null) {
            throw new RuntimeException("Invalid status");
        }

        if (!normalized.equalsIgnoreCase(order.getOrderStatus())) {
            order.setOrderStatus(normalized);
            order = orderRepo.save(order);
        }

        AdminOrderDTO result = AdminOrderDTO.from(order);

        // AFTER_COMMIT dispatch via OrderEventPublisher.
        orderEventPublisher.publish("ORDER_STATUS_CHANGED", order);

        return result;
    }

    // ANALYTICS DASHBOARD
    // totalRevenue = sum of Order.total over orders with
    // paymentStatus == "Paid" (platform-wide, paid orders only).
    @GetMapping("/analytics")
    public AnalyticsDTO analytics(
            HttpServletRequest req
    ) {

        getAdmin(req);

        long totalUsers =
                userRepo.count();

        long totalProducts =
                productRepo.count();

        long totalOrders =
                orderRepo.count();

        double totalRevenue =
                orderRepo.findAll()
                        .stream()

                        .filter(order ->
                                "Paid".equals(
                                        order.getPaymentStatus()
                                )
                        )

                        .mapToDouble(order ->
                                order.getTotal() != null
                                        ? order.getTotal()
                                        : 0
                        )

                        .sum();

        return new AnalyticsDTO(
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue
        );
    }
}
