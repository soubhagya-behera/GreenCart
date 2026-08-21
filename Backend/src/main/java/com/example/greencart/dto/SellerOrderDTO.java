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

// Seller-scoped order view: only the requesting seller's own line items,
// own subtotal and fulfillment data. Deliberately excludes deliveryOtp,
// razorpay identifiers, other sellers' items and the whole-cart total.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellerOrderDTO {

    private Long id;

    private LocalDateTime createdAt;

    private LocalDateTime deliveredAt;

    private String orderStatus;

    private String paymentStatus;

    private String paymentMethod;

    private Boolean otpVerified;

    private String address;

    // Sum of this seller's own line items only.
    private Double total;

    private CustomerInfo user;

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

        private Long productId;

        private String name;

        private String image;

        private Integer qty;

        private Double price;
    }

    // Compatibility aliases: expose the same values under the more
    // descriptive names used by the seller portal contract, without
    // breaking consumers that read "id" and "total".
    public Long getOrderId() {
        return id;
    }

    public Double getSellerSubtotal() {
        return total;
    }

    public static List<SellerOrderDTO> fromOrders(List<Order> orders, User seller) {

        List<SellerOrderDTO> result = new ArrayList<>();

        if (orders == null || seller == null) {
            return result;
        }

        for (Order order : orders) {

            SellerOrderDTO dto = from(order, seller);

            if (dto != null) {
                result.add(dto);
            }
        }

        return result;
    }

    public static SellerOrderDTO from(Order order, User seller) {

        if (order == null || seller == null || seller.getId() == null) {
            return null;
        }

        double sellerSubtotal = 0;

        List<Item> ownItems = new ArrayList<>();

        if (order.getItems() != null) {

            for (OrderItem orderItem : order.getItems()) {

                Product product = orderItem.getProduct();

                boolean ownedBySeller =
                        product != null
                                && product.getSeller() != null
                                && product.getSeller().getId() != null
                                && seller.getId().equals(product.getSeller().getId());

                if (!ownedBySeller) {
                    continue;
                }

                double linePrice = orderItem.getPrice() != null ? orderItem.getPrice() : 0;

                sellerSubtotal += linePrice * orderItem.getQty();

                ownItems.add(
                        new Item(
                                product.getId(),
                                product.getName(),
                                product.getImageUrl(),
                                orderItem.getQty(),
                                orderItem.getPrice()
                        )
                );
            }
        }

        if (ownItems.isEmpty()) {
            return null;
        }

        SellerOrderDTO dto = new SellerOrderDTO();

        dto.setId(order.getId());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setDeliveredAt(order.getDeliveredAt());
        dto.setOrderStatus(order.getOrderStatus());
        dto.setPaymentStatus(order.getPaymentStatus());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setOtpVerified(order.getOtpVerified());
        dto.setAddress(order.getAddress());
        dto.setTotal(sellerSubtotal);
        dto.setItems(ownItems);
        dto.setDeliveryNote(order.getDeliveryNote());
        dto.setProofImageUrl(order.getProofImageUrl());

        if (order.getUser() != null) {
            dto.setUser(
                    new CustomerInfo(
                            order.getUser().getId(),
                            order.getUser().getName(),
                            order.getUser().getEmail()
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

        return dto;
    }
}
