package com.example.greencart.dto;

// Real figures only — every value is computed from actual order data.
public record DeliveryOverviewDTO(
        boolean online,
        long availableRequests,
        long activeDeliveries,
        long completedToday,
        double deliveredValueToday
) {
}
