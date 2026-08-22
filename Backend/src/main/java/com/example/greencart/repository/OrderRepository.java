package com.example.greencart.repository;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUser(User user);

    List<Order> findByAssignedDelivery(User partner);

    // Orders waiting for a delivery partner
    List<Order> findByAssignedDeliveryIsNull();

    // Orders already claimed by some partner but not yet completed
    List<Order> findByAssignedDeliveryIsNotNullAndDeliveredAtIsNull();

    // Atomic delivery-partner assignment.
    //
    // Runs as a single UPDATE ... WHERE guarded on assignment, delivery and
    // lifecycle state, so when two partners accept simultaneously only one
    // UPDATE matches a row; every other caller sees 0 affected rows and
    // receives a conflict. Cancelled / unpaid / completed orders can never
    // be claimed because the status guard lives inside the same statement.
    // clearAutomatically/flushAutomatically keep the persistence context
    // consistent with the direct database change.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Order o SET o.assignedDelivery = :partner, o.assignedAt = :now " +
           "WHERE o.id = :id AND o.assignedDelivery IS NULL AND o.deliveredAt IS NULL " +
           "AND o.orderStatus IN :claimableStatuses")
    int claimOrder(
            @Param("id") Long id,
            @Param("partner") User partner,
            @Param("now") LocalDateTime now,
            @Param("claimableStatuses") Collection<String> claimableStatuses
    );

    int countByAssignedDeliveryAndOrderStatusIn(User partner, Collection<String> statuses);

    int countByAssignedDelivery(User partner);

    int countByAssignedDeliveryAndDeliveredAtNotNull(User partner);

    int countByAssignedDeliveryAndDeliveredAtBetween(User partner, LocalDateTime start, LocalDateTime end);
}
