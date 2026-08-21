package com.example.greencart.security;

import com.example.greencart.controller.NewsletterController;
import com.example.greencart.entity.User;
import com.example.greencart.exception.ForbiddenException;

import com.example.greencart.exception.UnauthorizedException;

import org.junit.jupiter.api.Test;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NewsletterControllerSecurityTest {

    private final NewsletterController controller = new NewsletterController();

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    private User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @Test
    void anonymousUserCannotSendAnnouncements() {
        assertThrows(UnauthorizedException.class, () -> controller.announce(
                Map.of("title", "t", "message", "m"), requestFor(null)));
    }

    @Test
    void normalUserCannotSendAnnouncements() {
        assertThrows(ForbiddenException.class, () -> controller.announce(
                Map.of("title", "t", "message", "m"),
                requestFor(user(1L, "user"))));
    }

    @Test
    void sellerCannotSendAnnouncements() {
        assertThrows(ForbiddenException.class, () -> controller.announce(
                Map.of("title", "t", "message", "m"),
                requestFor(user(2L, "seller"))));
    }

    @Test
    void deliveryUserCannotSendAnnouncements() {
        assertThrows(ForbiddenException.class, () -> controller.announce(
                Map.of("title", "t", "message", "m"),
                requestFor(user(3L, "delivery"))));
    }

    @Test
    void adminCanSendAnnouncements() {
        var response = controller.announce(
                Map.of("title", "t", "message", "m"),
                requestFor(user(9L, "admin")));

        assertEquals("Announcement sent", response.get("message"));
    }

    @Test
    void subscriptionRemainsOpenToEveryone() {
        var response = controller.subscribe(Map.of("email", "a@b.com"));
        assertEquals("Subscribed successfully", response.get("message"));
    }
}
