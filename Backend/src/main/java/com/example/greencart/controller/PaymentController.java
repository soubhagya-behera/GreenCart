package com.example.greencart.controller;

import com.example.greencart.service.RazorpayService;
import com.example.greencart.util.AccessGuard;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;

import lombok.RequiredArgsConstructor;

import org.json.JSONObject;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.greencart.dto.PaymentVerifyDTO;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.repository.OrderRepository;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payment")
public class PaymentController {

    private final RazorpayService razorpayService;

    private final OrderRepository orderRepo;

   // CREATE RAZORPAY ORDER
   // The chargeable amount is ALWAYS derived server-side from the
   // authenticated user's own stored order total. Any client-supplied
   // amount parameter is ignored by design.
   @PostMapping("/create-order")
public ResponseEntity<?> createOrder(
        @RequestParam Long orderId,
        HttpServletRequest request
) throws Exception {

    User user = (User) request.getAttribute("user");

    if (user == null) {
        throw new UnauthorizedException();
    }

    Order order =
            orderRepo.findById(orderId)
                    .orElseThrow(() ->
                            new RuntimeException("Order not found"));

    AccessGuard.require(
            AccessGuard.isAdmin(user)
                    || AccessGuard.isOrderCustomer(user, order),
            "You can only pay for your own orders"
    );

    if (order.getTotal() == null || order.getTotal() <= 0) {
        throw new RuntimeException("Invalid order amount");
    }

    String razorpayJson =
            razorpayService.createOrder(order.getTotal());

    JSONObject razorpayOrder =
            new JSONObject(razorpayJson);

    return ResponseEntity.ok(
            Map.of(
                    "id",
                    razorpayOrder.optString("id"),

                    "amount",
                    razorpayOrder.optInt("amount"),

                    "currency",
                    razorpayOrder.optString("currency", "INR")
            )
    );
}


 @PostMapping("/verify")
public ResponseEntity<?> verifyPayment(
        @RequestBody PaymentVerifyDTO dto,
        HttpServletRequest request
) throws Exception {

    User user = (User) request.getAttribute("user");

    if (user == null) {
        throw new UnauthorizedException();
    }

    Order order =
            orderRepo.findById(dto.getOrderId())
                    .orElseThrow();

    // Ownership is resolved server-side; the frontend never decides it.
    // Admin retains platform-wide control.
    AccessGuard.require(
            AccessGuard.isAdmin(user)
                    || AccessGuard.isOrderCustomer(user, order),
            "You can only pay for your own orders"
    );

    boolean valid =
            razorpayService.verifyPayment(
                    dto.getRazorpayOrderId(),
                    dto.getRazorpayPaymentId(),
                    dto.getRazorpaySignature()
            );

    if (!valid) {

        throw new RuntimeException(
                "Invalid payment signature"
        );
    }

    order.setPaymentStatus("Paid");

    order.setOrderStatus("Confirmed");

    order.setRazorpayOrderId(
            dto.getRazorpayOrderId()
    );

    order.setRazorpayPaymentId(
            dto.getRazorpayPaymentId()
    );

    orderRepo.save(order);

    return ResponseEntity.ok(
            Map.of(
                    "message",
                    "Payment verified"
            )
    );
}
}