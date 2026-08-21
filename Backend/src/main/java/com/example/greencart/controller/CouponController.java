package com.example.greencart.controller;

import com.example.greencart.dto.CouponDTO;

import com.example.greencart.entity.*;
import com.example.greencart.exception.UnauthorizedException;

import com.example.greencart.repository.*;

import com.example.greencart.util.RoleChecker;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class CouponController {

    private final CouponRepository couponRepo;

    // CREATE COUPON (ADMIN)
    @PostMapping("/admin/coupons")
    public Coupon createCoupon(
            @RequestBody Coupon coupon,
            HttpServletRequest req
    ) {

        User admin =
                (User) req.getAttribute("user");

        if (admin == null) {

            throw new RuntimeException(
                    "Unauthorized"
            );
        }

        RoleChecker.checkRole(
                admin,
                "admin"
        );

        return couponRepo.save(coupon);
    }

    // LIST ALL COUPONS (ADMIN)
    @GetMapping("/admin/coupons")
    public List<Coupon> allCoupons(
            HttpServletRequest req
    ) {

        requireAdmin(req);

        return couponRepo.findAll();
    }

    // UPDATE COUPON (ADMIN)
    @PutMapping("/admin/coupons/{id}")
    public Coupon updateCoupon(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest req
    ) {

        requireAdmin(req);

        Coupon coupon = couponRepo.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Coupon not found"));

        if (body.containsKey("code")
                && body.get("code") != null) {
            coupon.setCode(String.valueOf(body.get("code")));
        }

        if (body.get("discountPercent") instanceof Number n) {
            coupon.setDiscountPercent(n.doubleValue());
        }

        if (body.get("minAmount") instanceof Number n) {
            coupon.setMinAmount(n.doubleValue());
        }

        if (body.containsKey("active")
                && body.get("active") != null) {
            coupon.setActive(Boolean.parseBoolean(
                    String.valueOf(body.get("active"))));
        }

        if (body.get("expiryDate") != null
                && !String.valueOf(body.get("expiryDate")).isBlank()) {
            coupon.setExpiryDate(LocalDateTime.parse(
                    String.valueOf(body.get("expiryDate"))));
        }

        return couponRepo.save(coupon);
    }

    // DELETE COUPON (ADMIN)
    @DeleteMapping("/admin/coupons/{id}")
    public Map<String, String> deleteCoupon(
            @PathVariable Long id,
            HttpServletRequest req
    ) {

        requireAdmin(req);

        if (!couponRepo.existsById(id)) {
            throw new RuntimeException("Coupon not found");
        }

        couponRepo.deleteById(id);

        return Map.of("message", "Coupon deleted");
    }

    private void requireAdmin(HttpServletRequest req) {

        User admin = (User) req.getAttribute("user");

        if (admin == null) {
            throw new UnauthorizedException();
        }

        RoleChecker.checkRole(admin, "admin");
    }

    // GET ALL COUPONS
    @GetMapping("/coupons")
    public List<Coupon> allCoupons() {

        return couponRepo.findAll();
    }

    // APPLY COUPON
    @PostMapping("/coupons/apply")
    public Map<String, Object> applyCoupon(
            @RequestBody CouponDTO dto
    ) {

        Coupon coupon =
                couponRepo.findByCode(
                        dto.getCode()
                ).orElseThrow(() ->
                        new RuntimeException(
                                "Invalid coupon"
                        )
                );

        // CHECK ACTIVE
        if (!coupon.getActive()) {

            throw new RuntimeException(
                    "Coupon inactive"
            );
        }

        // CHECK EXPIRY
        if (coupon.getExpiryDate()
                .isBefore(LocalDateTime.now())) {

            throw new RuntimeException(
                    "Coupon expired"
            );
        }

        // CHECK MIN AMOUNT
        if (dto.getAmount()
                < coupon.getMinAmount()) {

            throw new RuntimeException(
                    "Minimum amount not reached"
            );
        }

        // CALCULATE DISCOUNT
        double discount =
                dto.getAmount()
                        * coupon.getDiscountPercent()
                        / 100;

        double finalAmount =
                dto.getAmount() - discount;

        return Map.of(
                "originalAmount",
                dto.getAmount(),

                "discount",
                discount,

                "finalAmount",
                finalAmount,

                "coupon",
                coupon.getCode()
        );
    }
}