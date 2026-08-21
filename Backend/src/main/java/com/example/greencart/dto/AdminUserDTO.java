package com.example.greencart.dto;

import com.example.greencart.entity.User;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Admin-facing user record. Never serializes credentials or
// authentication state (otp/resetOtp are @JsonIgnore on the entity;
// password is write-only) and drops the shipping-address block.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDTO {

    private Long id;

    private String name;

    private String email;

    private String role;

    private String phone;

    private String avatarUrl;

    private String storeName;

    private boolean verified;

    public static AdminUserDTO from(User user) {

        if (user == null) {
            return null;
        }

        return new AdminUserDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getPhone(),
                user.getAvatarUrl(),
                user.getStoreName(),
                user.isVerified()
        );
    }
}
