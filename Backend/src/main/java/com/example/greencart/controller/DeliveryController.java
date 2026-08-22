package com.example.greencart.controller;

import com.example.greencart.dto.DeliveryOverviewDTO;
import com.example.greencart.dto.DeliveryRequestDTO;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.repository.UserRepository;
import com.example.greencart.service.DeliveryService;
import com.example.greencart.util.AccessGuard;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Delivery Partner portal API.
//
// The partner never types an order id: available requests are listed by
// GET /delivery/requests and claimed atomically via PUT /delivery/orders/{id}/accept.
@RestController
@RequiredArgsConstructor
@RequestMapping("/delivery")
public class DeliveryController {

    private final DeliveryService deliveryService;

    private final UserRepository userRepo;

    // Current partner identity + availability (profile header / toggle).
    @GetMapping("/me")
    public User me(HttpServletRequest req) {

        User user = requireDelivery(req);

        return sanitize(user);
    }

    // Online/Offline availability toggle.
    // While delivering, the dashboard derives BUSY from active orders —
    // availability and workload never contradict each other.
    @PutMapping("/availability")
    public User setAvailability(
            @RequestBody Map<String, Boolean> body,
            HttpServletRequest req
    ) {

        User user = requireDelivery(req);

        boolean online = Boolean.TRUE.equals(body.get("online"));

        user.setOnline(online);

        return sanitize(userRepo.save(user));
    }

    // Overview cards — computed from real order data.
    @GetMapping("/overview")
    public DeliveryOverviewDTO overview(HttpServletRequest req) {

        User user = requireDelivery(req);

        return deliveryService.overview(user);
    }

    // NEW DELIVERY REQUESTS — unassigned orders waiting for a partner.
    @GetMapping("/requests")
    public List<DeliveryRequestDTO> requests(HttpServletRequest req) {

        requireDelivery(req);

        return deliveryService.availableRequests();
    }

    // MY ORDERS — active deliveries + completed history for this partner.
    @GetMapping("/orders")
    public List<Order> myOrders(HttpServletRequest req) {

        User user = requireDelivery(req);

        return deliveryService.myOrders(user);
    }

    // ACCEPT ORDER — atomic assignment (409 when another partner won).
    @PutMapping("/orders/{id}/accept")
    public Order acceptOrder(
            @PathVariable Long id,
            HttpServletRequest req
    ) {

        User user = requireDelivery(req);

        return deliveryService.accept(user, id);
    }

    // MARK DELIVERED — manual completion following the same payment rules
    // as the demo auto-delivery timer (single shared implementation).
    @PutMapping("/orders/{id}/delivered")
    public Order markDelivered(
            @PathVariable Long id,
            HttpServletRequest req
    ) {

        User user = requireDelivery(req);

        Order order = deliveryService.myOrders(user).stream()
                .filter(o -> o.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new ForbiddenException(
                        "Only the assigned delivery partner can complete this order"));

        return deliveryService.markDelivered(order);
    }

    // ---- helpers -----------------------------------------------------------

    private User requireDelivery(HttpServletRequest req) {

        User user = (User) req.getAttribute("user");

        if (user == null) {
            throw new UnauthorizedException();
        }

        AccessGuard.require(
                AccessGuard.hasAnyRole(user, "delivery", "admin"),
                "Delivery partner access required"
        );

        return user;
    }

    // Never echo password material back to the client.
    private User sanitize(User user) {

        user.setPassword(null);

        return user;
    }
}
