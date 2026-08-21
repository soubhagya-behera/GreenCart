package com.example.greencart.controller;

import com.example.greencart.entity.User;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/newsletter")
public class NewsletterController {

    // In a real app you'd save emails to a database
    @PostMapping("/subscribe")
    public Map<String, String> subscribe(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        // TODO: save email to DB
        System.out.println("Newsletter subscription: " + email);
        return Map.of("message", "Subscribed successfully");
    }

    @PostMapping("/announce")
    public Map<String, String> announce(
            @RequestBody Map<String, String> body,
            HttpServletRequest req
    ) {
        User user = (User) req.getAttribute("user");

        if (user == null) {
            throw new UnauthorizedException();
        }

        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new ForbiddenException("Only admins can send platform announcements");
        }

        // TODO: send email to all subscribers
        System.out.println("Announcement: " + body.get("title"));
        return Map.of("message", "Announcement sent");
    }
}
