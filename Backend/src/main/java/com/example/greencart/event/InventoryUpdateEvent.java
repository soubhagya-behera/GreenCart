package com.example.greencart.event;

public record InventoryUpdateEvent(
        Long productId,
        String type,
        Integer stock
) {
}
