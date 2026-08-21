package com.example.greencart.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

// Seller-specific analytics. Every monetary figure is derived from
// order items belonging to the requesting seller only (item price x qty),
// never from Order.total, which spans the whole multi-vendor cart.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellerAnalyticsDTO {

    // Sum of (item.price * item.qty) over the seller's own items in
    // orders with paymentStatus == "Paid" and status != "Cancelled".
    private Double totalRevenue;

    // Distinct orders containing at least one of the seller's items,
    // excluding cancelled orders.
    private Long totalOrders;

    // Of those: not yet Delivered.
    private Long pendingOrders;

    // Of those: Delivered.
    private Long completedOrders;

    // The seller's listings with active = true.
    private Long activeProducts;

    // Top products by revenue over the same paid subset (max 5).
    private List<TopProduct> topProducts = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopProduct {

        private Long productId;

        private String name;

        private String image;

        private Long qtySold;

        private Double revenue;
    }
}
