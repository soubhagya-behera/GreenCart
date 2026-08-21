package com.example.greencart.util;

import java.util.Map;
import java.util.Set;

// Canonical order status values for the whole application.
// "OutForDelivery" is the canonical spelling (used by the frontend
// progress tracker and dashboards). Legacy spellings written earlier
// ("Out for Delivery", "Out For Delivery") are normalized on input.
public final class OrderStatuses {

    public static final String AWAITING_PAYMENT = "Awaiting Payment";
    public static final String CONFIRMED = "Confirmed";
    public static final String PROCESSING = "Processing";
    public static final String PACKED = "Packed";
    public static final String SHIPPED = "Shipped";
    public static final String PICKED_UP = "Picked Up";
    public static final String OUT_FOR_DELIVERY = "OutForDelivery";
    public static final String DELIVERED = "Delivered";
    public static final String CANCELLED = "Cancelled";

    private static final Set<String> CANONICAL = Set.of(
            AWAITING_PAYMENT,
            CONFIRMED,
            PROCESSING,
            PACKED,
            SHIPPED,
            PICKED_UP,
            OUT_FOR_DELIVERY,
            DELIVERED,
            CANCELLED
    );

    private static final Map<String, String> LEGACY_ALIASES = Map.of(
            "out for delivery", OUT_FOR_DELIVERY,
            "out  for delivery", OUT_FOR_DELIVERY
    );

    private OrderStatuses() {
    }

    // Returns the canonical value, or null when unknown/invalid.
    // Exact canonical matches pass through; legacy variants are mapped.
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (CANONICAL.contains(trimmed)) {
            return trimmed;
        }
        return LEGACY_ALIASES.get(trimmed.toLowerCase());
    }

    // True when the value is a known status (canonical or legacy alias).
    public static boolean isAllowed(String raw) {
        return normalize(raw) != null;
    }

    public static Set<String> canonicalValues() {
        return CANONICAL;
    }
}
