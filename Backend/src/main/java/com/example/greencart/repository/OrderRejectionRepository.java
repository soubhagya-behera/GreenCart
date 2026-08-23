package com.example.greencart.repository;

import com.example.greencart.entity.OrderRejection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRejectionRepository extends JpaRepository<OrderRejection, Long> {

    // Idempotency check for reject().
    boolean existsByOrderIdAndPartnerId(Long orderId, Long partnerId);

    // Orders this partner must NOT see in the available-requests queue.
    List<OrderRejection> findByPartnerId(Long partnerId);

    // Rejections are meaningless once a partner claimed the order.
    void deleteByOrderId(Long orderId);
}
