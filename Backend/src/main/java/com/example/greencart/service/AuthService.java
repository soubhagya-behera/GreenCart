package com.example.greencart.service;

import com.example.greencart.dto.RegisterRequestDTO;
import com.example.greencart.dto.UserResponseDTO;
import com.example.greencart.entity.User;
import com.example.greencart.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepo;

    private final BCryptPasswordEncoder encoder;

    private final EmailService emailService;

    // Roles a client may self-register as. "admin" is NEVER allowed here;
    // admin accounts are created only via AdminBootstrap or an existing
    // admin promoting a user through PUT /admin/users/{id}/role.
    private static final Set<String> ALLOWED_REGISTRATION_ROLES =
            Set.of("user", "seller", "delivery");

    public UserResponseDTO register(RegisterRequestDTO request) {

        // Check existing user
        User existingUser = userRepo
                .findByEmail(request.getEmail())
                .orElse(null);

        // If already verified
        if (existingUser != null && existingUser.isVerified()) {

            throw new RuntimeException(
                    "Email already registered"
            );
        }

        // Generate OTP
        String otp = String.valueOf(
                100000 + new Random().nextInt(900000)
        );

        // Existing but not verified
       if (existingUser != null) {

    throw new RuntimeException(
            "Email already registered"
    );
}
        // Create new user
        User user = new User();

        user.setName(request.getName());

        user.setEmail(request.getEmail());

        user.setPassword(
                encoder.encode(request.getPassword())
        );

        // Privilege-escalation guard: ignore any client-chosen role
        // outside the whitelist (e.g. "admin") and fall back to "user".
        String requestedRole = request.getRole();
        String safeRole = (requestedRole != null
                && ALLOWED_REGISTRATION_ROLES.contains(requestedRole.toLowerCase()))
                ? requestedRole.toLowerCase()
                : "user";

        user.setRole(safeRole);

        user.setOtp(otp);

        user.setVerified(true);

        // Save user
        User savedUser = userRepo.save(user);

        // Send OTP email
        emailService.sendOtpEmail(
                user.getEmail(),
                otp
        );

       return userToDTO(savedUser);
    }

    // Convert User -> UserResponseDTO
    public UserResponseDTO userToDTO(User user) {

        UserResponseDTO dto = new UserResponseDTO();

        dto.setId(user.getId());

        dto.setName(user.getName());

        dto.setEmail(user.getEmail());

        dto.setRole(user.getRole());

        dto.setPhone(user.getPhone());

        dto.setAvatarUrl(user.getAvatarUrl());

        dto.setStoreName(user.getStoreName());

        dto.setVerified(user.isVerified());

        return dto;
    }
}