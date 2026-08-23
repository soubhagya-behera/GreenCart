package com.example.greencart.repository;

import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findBySeller(User seller);

    // Seller inventory: only listings currently active. Removed products
    // stay in the database but leave this list.
    List<Product> findBySellerAndActiveTrue(User seller);

    List<Product> findByActiveTrue();

    @Query("SELECT DISTINCT p.category FROM Product p "
            + "WHERE p.active = true AND p.category IS NOT NULL")
    List<String> findDistinctCategories();
}