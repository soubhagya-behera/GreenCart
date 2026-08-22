package com.example.greencart.dto;

import com.example.greencart.entity.User;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Admin view of one delivery partner — all figures computed from real
// orders assigned to the partner; nothing self-reported except availability.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDeliveryPartnerDTO {

    private Long id;

    private String name;

    private String email;

    private String phone;

    private boolean online;

    // Orders currently Picked Up / OutForDelivery for this partner.
    private long activeDeliveries;

    // Delivered all-time.
    private long completedDeliveries;

    // Delivered today.
    private long completedToday;

    public static AdminDeliveryPartnerDTO from(
            User user,
            long activeDeliveries,
            long completedDeliveries,
            long completedToday) {

        return new AdminDeliveryPartnerDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.isOnline(),
                activeDeliveries,
                completedDeliveries,
                completedToday
        );
    }
}
