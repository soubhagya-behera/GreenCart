package com.example.greencart.event;

import java.time.LocalDateTime;

// Real-time order lifecycle event. Published by OrderEventPublisher to:
//   - /topic/delivery          (delivery partners + admins; operational)
//   - /user/{email}/queue/orders  (the owning customer only, private queue)
//
// Event types (all pushed AFTER the database transaction commits):
//   NEW_REQUEST            - checkout produced a deliverable order
//   ACCEPTED               - a partner claimed the order
//   ORDER_STATUS_CHANGED   - any lifecycle status transition (admin/pickup)
//   PAYMENT_STATUS_CHANGED - paymentStatus changed (e.g. UPI verified Paid)
//   ORDER_COMPLETED        - delivered; COD collected when applicable
//   CANCELLED              - customer cancelled
//   PARTNER_STATUS         - delivery partner went online/offline
//
// Wire-safe: carries NO customer PII. customerId/customerEmail below are
// routing hints consumed inside the server only and stripped before the
// broadcast payload is serialized.
public record DeliveryUpdateEvent(
        String type,
        Long orderId,
        String orderStatus,
        String paymentStatus,
        Double total,
        String paymentMethod,

        // Assignment info (ACCEPTED / later transitions).
        Long deliveryPartnerId,
        String deliveryPartnerName,
        LocalDateTime assignedAt,

        // Completion stamp (ORDER_COMPLETED).
        LocalDateTime deliveredAt,

        // Server-side routing only; never serialized onto /topic/delivery.
        Long customerId,
        String customerEmail,

        // PARTNER_STATUS events only.
        Long partnerId,
        Boolean partnerOnline
) {

    // Backward-compatible factory for the original six fields.
    public static DeliveryUpdateEvent of(
            String type, Long orderId, String orderStatus,
            String paymentStatus, Double total, String paymentMethod) {
        return new DeliveryUpdateEvent(type, orderId, orderStatus,
                paymentStatus, total, paymentMethod,
                null, null, null, null, null, null, null, null);
    }
}
