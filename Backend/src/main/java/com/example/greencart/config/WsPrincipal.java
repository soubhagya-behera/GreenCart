package com.example.greencart.config;

import java.security.Principal;

// STOMP session principal built from the project's existing JWT.
// name = user email (unique) so convertAndSendToUser routes correctly.
public record WsPrincipal(String name, Long userId, String role)
        implements Principal {

    @Override
    public String getName() {
        return name;
    }

    public boolean hasAnyRole(String... roles) {

        for (String r : roles) {
            if (r != null && r.equalsIgnoreCase(role)) {
                return true;
            }
        }

        return false;
    }
}
