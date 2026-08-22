package com.example.greencart.controller;

import com.example.greencart.dto.CheckoutDTO;
import com.example.greencart.entity.*;
import com.example.greencart.repository.*;
import com.example.greencart.service.DeliveryService;
import com.example.greencart.service.FileUploadService;
import com.example.greencart.util.AccessGuard;
import com.example.greencart.util.OrderStatuses;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/orders")
public class OrderController {

    private final OrderRepository repo;

    private final CartRepository cartRepo;

    private final CartItemRepository itemRepo;

    private final OrderItemRepository orderItemRepo;

    private final ProductRepository productRepo;

    private final FileUploadService fileUploadService;

    private final DeliveryService deliveryService;

    // GET MY ORDERS (read-only: never mutates order status)
    @GetMapping("/my")
    public List<Order> myOrders(
            HttpServletRequest req) {

        User user = (User) req.getAttribute("user");

        if (user == null) {

            throw new UnauthorizedException();
        }

        return repo.findByUser(user);
    }

    // CHECKOUT API
    // CHECKOUT API
    @PostMapping("/checkout")
    public Order checkout(
            @RequestBody CheckoutDTO dto,
            HttpServletRequest req) {

        User user = (User) req.getAttribute("user");

        if (user == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (dto.getAddress() == null ||
                dto.getAddress().trim().isEmpty()) {
            throw new RuntimeException(
                    "Delivery address is required");
        }

        Cart cart = cartRepo.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        List<CartItem> cartItems = itemRepo.findByCart(cart);
        // Prevent seller from buying own products
        for (CartItem item : cartItems) {

            Product product = item.getProduct();

            if (product.getSeller() != null &&
                    product.getSeller().getId().equals(user.getId())) {

                throw new RuntimeException(
                        "You cannot purchase your own product: "
                                + product.getName());
            }
        }

        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        double total = 0;

        // Calculate total safely
        for (CartItem item : cartItems) {

            Product product = item.getProduct();

            Double finalPrice = product.getOfferPrice() != null
                    ? product.getOfferPrice()
                    : product.getPrice();

            total += finalPrice * item.getQty();
        }

        Order order = new Order();

        order.setUser(user);
        order.setAddress(dto.getAddress());
        order.setPaymentMethod(dto.getPaymentMethod());
        order.setTotal(total);

        if ("COD".equals(dto.getPaymentMethod())) {
            order.setOrderStatus("Processing");
            order.setPaymentStatus("Pending");
        } else {
            order.setOrderStatus("Awaiting Payment");
            order.setPaymentStatus("Pending");
        }

        Order savedOrder = repo.save(order);

        // Create order items + reduce stock
        for (CartItem item : cartItems) {

            Product product = item.getProduct();

            Double finalPrice = product.getOfferPrice() != null
                    ? product.getOfferPrice()
                    : product.getPrice();

            // Check stock
            if (product.getStock() < item.getQty()) {
                throw new RuntimeException(
                        product.getName()
                                + " has only "
                                + product.getStock()
                                + " items left");
            }

            // Reduce stock
            product.setStock(
                    product.getStock() - item.getQty());

            productRepo.save(product);

            OrderItem orderItem = new OrderItem();

            orderItem.setOrder(savedOrder);
            orderItem.setProduct(product);
            orderItem.setQty(item.getQty());
            orderItem.setPrice(finalPrice);

            orderItemRepo.save(orderItem);
        }

        // Clear cart after successful order
        itemRepo.deleteAll(cartItems);

        savedOrder.setItems(
                orderItemRepo.findByOrder(savedOrder));

        // COD orders are deliverable immediately; UPI orders only become
        // requests after payment verification (see PaymentController).
        if (OrderStatuses.PROCESSING.equals(savedOrder.getOrderStatus())) {
            deliveryService.notifyNewRequest(savedOrder);
        }

        return savedOrder;
    }

    // Get orders assigned to this delivery partner
    @GetMapping("/assigned")
    public List<Order> assignedOrders(HttpServletRequest req) {
        User user = (User) req.getAttribute("user");
        if (user == null)
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Unauthorized");
        return repo.findByAssignedDelivery(user);
    }

    // Acknowledge pick-up
    @PutMapping("/{id}/ack/pick")
    public Order ackPick(@PathVariable Long id, HttpServletRequest req) {
        User user = (User) req.getAttribute("user");
        if (user == null)
            throw new UnauthorizedException();
        Order order = repo.findById(id).orElseThrow();
        AccessGuard.require(
                AccessGuard.canManageLogistics(user, order),
                "Only the assigned delivery partner or an admin can update this order"
        );
        order.setOrderStatus("Picked Up");
        return repo.save(order);
    }

    // Acknowledge delivery (with OTP)
    // Delegates to DeliveryService.markDelivered so the COD collection rule
    // is identical to the demo auto-delivery timer's (single implementation).
    @PutMapping("/{id}/ack/deliver")
    public Order ackDeliver(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest req) {
        User user = (User) req.getAttribute("user");
        if (user == null)
            throw new UnauthorizedException();
        Order order = repo.findById(id).orElseThrow();
        AccessGuard.require(
                AccessGuard.canManageLogistics(user, order),
                "Only the assigned delivery partner or an admin can update this order"
        );
        return deliveryService.markDelivered(order);
    }

    @PutMapping("/{id}/cancel")
    public Order cancelOrder(
            @PathVariable Long id,
            HttpServletRequest req) {
        User user = (User) req.getAttribute("user");

        if (user == null) {
            throw new RuntimeException("Unauthorized");
        }

        Order order = repo.findById(id).orElseThrow();

        if (!order.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }

        // Prevent double cancellation
        if ("Cancelled".equals(order.getOrderStatus())) {
            throw new RuntimeException("Order already cancelled");
        }

        // Cannot cancel after shipping/delivery
        if (OrderStatuses.PICKED_UP.equals(order.getOrderStatus())
                || OrderStatuses.OUT_FOR_DELIVERY.equals(order.getOrderStatus())
                || OrderStatuses.DELIVERED.equals(order.getOrderStatus())) {

            throw new RuntimeException(
                    "Order cannot be cancelled now");
        }

        // Restore stock
        List<OrderItem> items = orderItemRepo.findByOrder(order);

        for (OrderItem item : items) {

            Product product = item.getProduct();

            product.setStock(
                    product.getStock() + item.getQty());

            productRepo.save(product);
        }

        order.setOrderStatus("Cancelled");

        Order saved = repo.save(order);

        // Partners watching this order refresh their dashboards.
        deliveryService.publish("CANCELLED", saved);

        return saved;
    }

    @PutMapping("/{id}/note")
    public Order addNote(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest req) {
        User user = (User) req.getAttribute("user");
        if (user == null)
            throw new UnauthorizedException();
        Order order = repo.findById(id).orElseThrow();
        AccessGuard.require(
                AccessGuard.canManageLogistics(user, order),
                "Only the assigned delivery partner or an admin can add notes"
        );
        order.setDeliveryNote(body.get("message"));
        return repo.save(order);
    }

    // Field name is "file" to match the frontend FormData key.
    @PostMapping("/{id}/proof")
    public Order uploadProof(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest req) throws Exception {
        User user = (User) req.getAttribute("user");
        if (user == null)
            throw new UnauthorizedException();
        Order order = repo.findById(id).orElseThrow();
        AccessGuard.require(
                AccessGuard.canManageLogistics(user, order),
                "Only the assigned delivery partner or an admin can upload proof"
        );
        String url = fileUploadService.uploadFile(file);
        order.setProofImageUrl(url);
        return repo.save(order);
    }

    @PostMapping("/{id}/otp/resend")
    public ResponseEntity<?> resendOtp(
            @PathVariable Long id,
            HttpServletRequest req) {
        User user = (User) req.getAttribute("user");
        if (user == null)
            throw new UnauthorizedException();
        Order order = repo.findById(id).orElseThrow();
        AccessGuard.require(
                AccessGuard.canManageLogistics(user, order),
                "Only the assigned delivery partner or an admin can resend the OTP"
        );
        // Generate new OTP and send to customer email
        String otp = String.valueOf(100000 + new java.util.Random().nextInt(900000));
        order.setDeliveryOtp(otp);
        repo.save(order);
        return ResponseEntity.ok(
                Map.of("message", "OTP resent"));
    }

}