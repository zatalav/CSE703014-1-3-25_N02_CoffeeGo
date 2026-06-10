package com.coffee.orderservice.controller;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.ApiResponse;
import com.coffee.orderservice.entity.Coupon;
import com.coffee.orderservice.repository.CouponRepository;
import java.time.LocalDate;
import java.util.Locale;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/customer/coupons")
public class CustomerCouponController {
    private final CouponRepository couponRepository;

    public CustomerCouponController(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    @GetMapping("/validate")
    public ApiResponse<CouponValidationResponse> validateCoupon(@RequestParam String code,
                                                                @RequestParam(defaultValue = "0") Long total) {
        Coupon coupon = couponRepository.findByCode(code.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new BadRequestException("Coupon not found"));
        long discount = calculateDiscount(coupon, total == null ? 0L : total);
        CouponValidationResponse response = new CouponValidationResponse();
        response.couponId = coupon.getCouponId();
        response.code = coupon.getCode();
        response.discount = discount;
        response.discountType = coupon.getDiscountType();
        response.discountValue = coupon.getDiscountValue();
        return ApiResponse.success(response);
    }

    private long calculateDiscount(Coupon coupon, long total) {
        if (!"active".equalsIgnoreCase(blankToDefault(coupon.getStatus(), "active"))) {
            throw new BadRequestException("Coupon is inactive");
        }
        LocalDate today = LocalDate.now();
        if (coupon.getStartDate() != null && today.isBefore(coupon.getStartDate())) {
            throw new BadRequestException("Coupon has not started");
        }
        if (coupon.getEndDate() != null && today.isAfter(coupon.getEndDate())) {
            throw new BadRequestException("Coupon has expired");
        }
        if (coupon.getUsageLimit() != null
                && coupon.getUsedCount() != null
                && coupon.getUsedCount() >= coupon.getUsageLimit()) {
            throw new BadRequestException("Coupon usage limit reached");
        }
        if (coupon.getMinOrderValue() != null && total < coupon.getMinOrderValue()) {
            throw new BadRequestException("Order total is below coupon minimum");
        }
        long value = coupon.getDiscountValue() == null ? 0L : coupon.getDiscountValue();
        String type = coupon.getDiscountType() == null
                ? ""
                : coupon.getDiscountType().trim().toLowerCase(Locale.ROOT);
        long discount = type.contains("percent") || type.contains("percentage")
                ? Math.round(total * (value / 100.0))
                : value;
        if (coupon.getMaxDiscount() != null && coupon.getMaxDiscount() > 0) {
            discount = Math.min(discount, coupon.getMaxDiscount());
        }
        return Math.max(0L, Math.min(discount, total));
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    public static class CouponValidationResponse {
        public Long couponId;
        public String code;
        public Long discount;
        public String discountType;
        public Long discountValue;
    }
}
