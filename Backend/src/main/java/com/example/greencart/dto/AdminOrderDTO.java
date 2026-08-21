package com.example.greencart.dto;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderItem;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Platform-wide order view for the admin portal.
// Exposes the full marketplace picture including per-line seller
// attribution, but excludes internal security fields (deliveryOtp)
// and payment gateway identifiers (razorpayOrderId/razorpayPaymentId).
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminOrderDTO {

    private Long id;

    private LocalDateTime createdAt;

    private LocalDateTime deliveredAt;

    private String orderStatus;

    private String paymentStatus;

    private String paymentMethod;

    private Boolean otpVerified;

    private String address;

    // Whole-cart total (platform view; admin sees the full amount).
    private Double total;

    private CustomerInfo customer;

    private DeliveryPartner assignedDelivery;

    private List<Item> items = new ArrayList<>();

    private String deliveryNote;

    private String proofImageUrl;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfo {

        private Long id;

        private String name;

        private String email;

        private String phone;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryPartner {

        private Long id;

        private String name;

        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {

        private Long itemId;

        private Long productId;

        private String productName;

        private String productImage;

        private Integer qty;

        private Double price;

        private Long sellerId;

        private String sellerName;
    }

    public static AdminOrderDTO from(Order order) {

        AdminOrderDTO dto = new AdminOrderDTO();

        if (order == null) {
            return dto;
        }

        dto.setId(order.getId());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setDeliveredAt(order.getDeliveredAt());
        dto.setOrderStatus(order.getOrderStatus());
        dto.setPaymentStatus(order.getPaymentStatus());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setOtpVerified(order.getOtpVerified());
        dto.setAddress(order.getAddress());
        dto.setTotal(order.getTotal());
        dto.setDeliveryNote(order.getDeliveryNote());
        dto.setProofImageUrl(order.getProofImageUrl());

        if (order.getUser() != null) {
            dto.setCustomer(
                    new CustomerInfo(
                            order.getUser().getId(),
                            order.getUser().getName(),
                            order.getUser().getEmail(),
                            order.getUser().getPhone()
                    )
            );
        }

        if (order.getAssignedDelivery() != null) {
            dto.setAssignedDelivery(
                    new DeliveryPartner(
                            order.getAssignedDelivery().getId(),
                            order.getAssignedDelivery().getName(),
                            order.getAssignedDelivery().getEmail()
                    )
            );
        }

        if (order.getItems() != null) {

            List<Item> items = new ArrayList<>();

            for (OrderItem orderItem : order.getItems()) {

                Product product = orderItem.getProduct();

                Long sellerId = null;
                String sellerName = null;
                Long productId = null;
                String productName = null;
                String productImage = null;

                if (product != null) {
                    productId = product.getId();
                    productName = product.getName();
                    productImage = product.getImageUrl();
                    if (product.getSeller() != null) {
                        sellerId = product.getSeller().getId();
                        sellerName = product.getSeller().getName();
                    }
                }

                items.add(
                        new Item(
                                orderItem.getId(),
                                productId,
                                productName,
                                productImage,
                                orderItem.getQty(),
                                orderItem.getPrice(),
                                sellerId,
                                sellerName
                        )
                );
            }

            dto.setItems(items);
        }

        return dto;
    }
}
