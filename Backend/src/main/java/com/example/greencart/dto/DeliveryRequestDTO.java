package com.example.greencart.dto;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderItem;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Card shown to delivery partners in "Available Requests".
// Deliberately minimal: customer name + phone for contact, no emails,
// no gateway ids, no internal OTP material.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryRequestDTO {

    private Long id;

    private LocalDateTime createdAt;

    private Double total;

    private String paymentMethod;

    private String paymentStatus;

    private String orderStatus;

    private String address;

    private CustomerInfo customer;

    private List<ItemInfo> items = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfo {

        private Long id;

        private String name;

        private String phone;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemInfo {

        private String productName;

        private String productImage;

        private Integer qty;

        private Double price;
    }

    public static DeliveryRequestDTO from(Order order) {

        DeliveryRequestDTO dto = new DeliveryRequestDTO();

        if (order == null) {
            return dto;
        }

        dto.setId(order.getId());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setTotal(order.getTotal());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setPaymentStatus(order.getPaymentStatus());
        dto.setOrderStatus(order.getOrderStatus());
        dto.setAddress(order.getAddress());

        if (order.getUser() != null) {
            dto.setCustomer(
                    new DeliveryRequestDTO.CustomerInfo(
                            order.getUser().getId(),
                            order.getUser().getName(),
                            order.getUser().getPhone()
                    )
            );
        }

        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                dto.getItems().add(
                        new ItemInfo(
                                item.getProduct() != null ? item.getProduct().getName() : null,
                                item.getProduct() != null ? item.getProduct().getImageUrl() : null,
                                item.getQty(),
                                item.getPrice()
                        )
                );
            }
        }

        return dto;
    }
}
