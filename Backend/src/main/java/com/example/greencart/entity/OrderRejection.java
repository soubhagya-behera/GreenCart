package com.example.greencart.entity;

import jakarta.persistence.*;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// A delivery partner's "not interested" vote for one order.
//
// Smallest safe rejection model: one row per (order, partner), enforced by
// a unique constraint so repeated rejects can never duplicate. A rejection
// only hides the request from THAT partner — other partners still see and
// accept the order. Rows are deleted once the order is claimed; they never
// influence assignment itself (Order.assignedDelivery remains the single
// source of truth).
@Entity
@Table(
        name = "order_rejections",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_order_rejection",
                columnNames = { "order_id", "partner_id" }
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderRejection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Deliberately plain columns (no associations): rejections are
    // bookkeeping rows with no navigation needs and must not load or
    // cascade Order/User state.
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    private LocalDateTime rejectedAt;
}
