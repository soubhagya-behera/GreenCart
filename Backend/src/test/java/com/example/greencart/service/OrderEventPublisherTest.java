package com.example.greencart.service;

import com.example.greencart.entity.Order;
import com.example.greencart.entity.User;
import com.example.greencart.event.DeliveryUpdateEvent;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

// Verifies the real-time pipeline: events are queued as application events,
// the AFTER_COMMIT bridge broadcasts wire-safe payloads to /topic/delivery
// and pushes a private copy into the owning customer's queue.
class OrderEventPublisherTest {

    private SimpMessagingTemplate messagingTemplate;

    private ApplicationEventPublisher applicationEventPublisher;

    private OrderEventPublisher publisher;

    @BeforeEach
    void setUp() {

        messagingTemplate = mock(SimpMessagingTemplate.class);

        applicationEventPublisher = mock(ApplicationEventPublisher.class);

        publisher = new OrderEventPublisher(
                messagingTemplate, applicationEventPublisher);
    }

    private Order order(Long id) {

        User customer = new User();
        customer.setId(10L);
        customer.setEmail("customer@example.com");
        customer.setName("Customer");

        User partner = new User();
        partner.setId(5L);
        partner.setName("Partner");
        partner.setRole("delivery");

        Order o = new Order();
        o.setId(id);
        o.setUser(customer);
        o.setAssignedDelivery(partner);
        o.setOrderStatus("OutForDelivery");
        o.setPaymentStatus("Pending");
        o.setPaymentMethod("COD");
        o.setTotal(220.0);
        o.setAssignedAt(LocalDateTime.now().minusMinutes(1));

        return o;
    }

    @Test
    void publish_queuesApplicationEventForAfterCommitDispatch() {

        publisher.publish("ACCEPTED", order(7L));

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(applicationEventPublisher).publishEvent(captor.capture());

        DeliveryUpdateEvent event = (DeliveryUpdateEvent) captor.getValue();

        assertEquals("ACCEPTED", event.type());
        assertEquals(7L, event.orderId());
        assertEquals(5L, event.deliveryPartnerId());
        assertEquals("Partner", event.deliveryPartnerName());
        assertEquals("customer@example.com", event.customerEmail());

        // No STOMP traffic before commit.
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void afterCommit_broadcastsWireSafePayloadAndPushesToCustomer() {

        publisher.onLifecycleEvent(
                new DeliveryUpdateEvent(
                        "ACCEPTED", 7L, "OutForDelivery", "Pending",
                        220.0, "COD",
                        5L, "Partner", LocalDateTime.now(), null,
                        10L, "customer@example.com",
                        null, null));

        ArgumentCaptor<DeliveryUpdateEvent> topic =
                ArgumentCaptor.forClass(DeliveryUpdateEvent.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/delivery"), topic.capture());

        // Routing fields stripped from the broadcast payload.
        assertNull(topic.getValue().customerId());
        assertNull(topic.getValue().customerEmail());

        ArgumentCaptor<DeliveryUpdateEvent> queue =
                ArgumentCaptor.forClass(DeliveryUpdateEvent.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq("customer@example.com"), eq("/queue/orders"), queue.capture());

        assertEquals("ACCEPTED", queue.getValue().type());
    }

    @Test
    void eventWithoutCustomer_broadcastsTopicOnly() {

        publisher.onLifecycleEvent(
                new DeliveryUpdateEvent(
                        "NEW_REQUEST", 8L, "Processing", "Pending",
                        99.0, "UPI",
                        null, null, null, null,
                        null, null,
                        null, null));

        verify(messagingTemplate, times(1))
                .convertAndSend(eq("/topic/delivery"), any(DeliveryUpdateEvent.class));
        verify(messagingTemplate, times(0))
                .convertAndSendToUser(any(), any(), any());
    }

    @Test
    void partnerStatus_isBroadcastWithAvailabilityFlag() {

        User partner = new User();
        partner.setId(5L);
        partner.setName("Partner");
        partner.setOnline(true);

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);

        publisher.publishPartnerStatus(partner);
        verify(applicationEventPublisher).publishEvent(captor.capture());

        publisher.onLifecycleEvent((DeliveryUpdateEvent) captor.getValue());

        ArgumentCaptor<DeliveryUpdateEvent> topic =
                ArgumentCaptor.forClass(DeliveryUpdateEvent.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/delivery"), topic.capture());

        assertEquals("PARTNER_STATUS", topic.getValue().type());
        assertEquals(Boolean.TRUE, topic.getValue().partnerOnline());
    }
}
