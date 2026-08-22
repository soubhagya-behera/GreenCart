package com.example.greencart.repository;

import com.example.greencart.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByRoleIgnoreCase(String role);

    List<User> findByRoleIgnoreCase(String role);
}
