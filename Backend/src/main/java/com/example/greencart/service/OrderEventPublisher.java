package com.example.greencart.service;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.event.DeliveryUpdateEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// Real-time event pipeline.
//
//   business service  --publish()-->  Spring application event
//         (inside or outside a transaction)
//                          |
//                          v  AFTER_COMMIT (fallbackExecution when no tx)
//   broadcastDelivery() ->  /topic/delivery          partners + admins
//   pushToCustomer()    ->  /user/{email}/queue/orders  owning customer
//
// Publishing as an application event guarantees clients never receive an
// "assigned"/"delivered" event for a transaction that later rolls back:
// the STOMP send happens strictly after commit. When no transaction is
// active (e.g. the availability toggle) fallbackExecution sends right away.
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventPublisher {

    public static final String DELIVERY_TOPIC = "/topic/delivery";

    public static final String CUSTOMER_ORDER_QUEUE = "/queue/orders";

    private final SimpMessagingTemplate messagingTemplate;

    private final ApplicationEventPublisher applicationEventPublisher;

    // Entry point used by services/controllers. Safe inside @Transactional
    // methods: actual network IO is deferred until AFTER_COMMIT.
    public void publish(String type, Order order) {

        if (order == null || order.getId() == null) {
            return;
        }

        User partner = order.getAssignedDelivery();

        User customer = order.getUser();

        DeliveryUpdateEvent event = new DeliveryUpdateEvent(
                type,
                order.getId(),
                order.getOrderStatus(),
                order.getPaymentStatus(),
                order.getTotal(),
                order.getPaymentMethod(),
                partner != null ? partner.getId() : null,
                partner != null ? partner.getName() : null,
                order.getAssignedAt(),
                order.getDeliveredAt(),
                customer != null ? customer.getId() : null,
                customer != null ? customer.getEmail() : null,
                null,
                null);

        publish(event);
    }

    // Delivery-partner availability changed (online/offline).
    public void publishPartnerStatus(User partner) {

        if (partner == null || partner.getId() == null) {
            return;
        }

        publish(new DeliveryUpdateEvent(
                "PARTNER_STATUS",
                null, null, null, null, null,
                partner.getId(), partner.getName(),
                null, null, null, null,
                partner.getId(), partner.isOnline()));
    }

    // Marks the event for AFTER_COMMIT dispatch.
    public void publish(DeliveryUpdateEvent event) {

        if (event == null) {
            return;
        }

        applicationEventPublisher.publishEvent(event);
    }

    // ---- AFTER_COMMIT dispatch -------------------------------------------

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true)
    public void onLifecycleEvent(DeliveryUpdateEvent event) {
        broadcastDelivery(toWire(event));
        if (event.customerEmail() != null && !event.customerEmail().isBlank()) {
            pushToCustomer(event.customerEmail(), toWire(event));
        }
    }

    // Wire-safe copy: strips server-side routing fields (customerId /
    // customerEmail) so no private information reaches any client topic.
    static DeliveryUpdateEvent toWire(DeliveryUpdateEvent event) {

        return new DeliveryUpdateEvent(
                event.type(), event.orderId(), event.orderStatus(),
                event.paymentStatus(), event.total(), event.paymentMethod(),
                event.deliveryPartnerId(), event.deliveryPartnerName(),
                event.assignedAt(), event.deliveredAt(),
                null, null,
                event.partnerId(), event.partnerOnline());
    }

    private void broadcastDelivery(DeliveryUpdateEvent wire) {

        try {
            messagingTemplate.convertAndSend(DELIVERY_TOPIC, wire);
        } catch (Exception e) {
            log.warn("[REALTIME] Failed to broadcast {} for order #{}: {}",
                    wire.type(), wire.orderId(), e.getMessage());
        }
    }

    private void pushToCustomer(String email, DeliveryUpdateEvent wire) {

        try {
            messagingTemplate.convertAndSendToUser(
                    email, CUSTOMER_ORDER_QUEUE, wire);
        } catch (Exception e) {
            log.warn("[REALTIME] Failed to push {} to customer {}: {}",
                    wire.type(), email, e.getMessage());
        }
    }
}
