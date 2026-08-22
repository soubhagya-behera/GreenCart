package com.example.greencart.event;

// Broadcast on /topic/delivery whenever the delivery lifecycle changes:
// NEW_REQUEST (checkout produced a deliverable order),
// ACCEPTED  (a partner claimed an order),
// DELIVERED (order completed; COD collected when applicable).
public record DeliveryUpdateEvent(
        String type,
        Long orderId,
        String orderStatus,
        String paymentStatus,
        Double total,
        String paymentMethod
) {
}
