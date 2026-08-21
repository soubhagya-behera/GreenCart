package com.example.greencart.config;

import com.example.greencart.entity.User;
import com.example.greencart.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepo;

    private final BCryptPasswordEncoder encoder;

    @Override
    public void run(String... args) {

        String email = System.getenv("ADMIN_EMAIL");
        String password = System.getenv("ADMIN_PASSWORD");

        if (email == null || email.isBlank()
                || password == null || password.isBlank()) {
            log.info("Admin bootstrap skipped: ADMIN_EMAIL / ADMIN_PASSWORD not set");
            return;
        }

        if (userRepo.existsByRoleIgnoreCase("admin")) {
            log.info("Admin bootstrap skipped: an admin account already exists");
            return;
        }

        if (userRepo.findByEmailIgnoreCase(email).isPresent()) {
            log.warn(
                    "Admin bootstrap skipped: email {} is already registered",
                    email
            );
            return;
        }

        User admin = new User();

        admin.setName("Admin");

        admin.setEmail(email);

        admin.setPassword(encoder.encode(password));

        admin.setRole("admin");

        admin.setVerified(true);

        userRepo.save(admin);

        log.info(
                "Bootstrap admin account created for {}",
                email
        );
    }
}
