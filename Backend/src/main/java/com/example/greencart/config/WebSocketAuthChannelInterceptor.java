package com.example.greencart.config;

import com.example.greencart.entity.User;
import com.example.greencart.repository.UserRepository;
import com.example.greencart.util.JwtUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

// Authenticates STOMP sessions and scopes subscriptions.
//
// CONNECT:
//   clients may send "Authorization: Bearer <jwt>" (same token as the REST
//   API). Valid tokens become a WsPrincipal for the session; guests without
//   tokens stay anonymous so public topics keep working.
//
// SUBSCRIBE:
//   /topic/delivery*      -> delivery partners and admins only
//   /user/queue/orders    -> any authenticated user (private per-user queue)
//   anything else         -> public (e.g. /topic/inventory)
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    private final UserRepository userRepo;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (!subscriptionAllowed(destination, principalOf(accessor))) {
                log.warn("[WS] Rejecting subscription to {} for principal {}",
                        destination, accessor.getUser());
                return null;
            }
        }

        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {

        String header = accessor.getFirstNativeHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            return;
        }

        try {
            Long userId = jwtUtil.extractUserId(header.substring(7));

            User user = userRepo.findById(userId).orElse(null);

            if (user != null && user.getEmail() != null) {
                accessor.setUser(new WsPrincipal(
                        user.getEmail(), user.getId(), user.getRole()));
            }
        } catch (Exception e) {
            // Invalid/expired token: stay anonymous rather than dropping
            // the connection; scoped topics will simply be refused.
            log.warn("[WS] CONNECT with invalid token: {}", e.getMessage());
        }
    }

    private boolean subscriptionAllowed(
            String destination, WsPrincipal principal) {

        if (destination == null) {
            return true;
        }

        if (destination.startsWith("/topic/delivery")) {
            return principal != null
                    && principal.hasAnyRole("delivery", "admin");
        }

        if (destination.startsWith("/user/queue/orders")
                || destination.startsWith("/user/topic/delivery")) {
            return principal != null;
        }

        return true;
    }

    private WsPrincipal principalOf(StompHeaderAccessor accessor) {

        return accessor.getUser() instanceof WsPrincipal p ? p : null;
    }
}
