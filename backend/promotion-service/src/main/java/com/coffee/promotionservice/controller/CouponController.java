package com.coffee.promotionservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.promotionservice.dto.response.CouponResponse;
import com.coffee.promotionservice.mapper.CouponMapper;
import com.coffee.promotionservice.repository.CouponRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/promotions/coupons")
public class CouponController {
    private final CouponRepository repository;
    private final CouponMapper mapper;

    public CouponController(CouponRepository repository, CouponMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @GetMapping
    public ApiResponse<List<CouponResponse>> list() {
        LocalDate today = LocalDate.now();
        List<CouponResponse> coupons = repository.findAll(Sort.by(Sort.Direction.DESC, "couponId")).stream()
                .filter(coupon -> coupon.getStatus() == null || "active".equalsIgnoreCase(coupon.getStatus()))
                .filter(coupon -> coupon.getStartDate() == null || !coupon.getStartDate().isAfter(today))
                .filter(coupon -> coupon.getEndDate() == null || !coupon.getEndDate().isBefore(today))
                .filter(coupon -> coupon.getUsageLimit() == null
                        || coupon.getUsedCount() == null
                        || coupon.getUsedCount() < coupon.getUsageLimit())
                .map(mapper::toResponse)
                .toList();
        return ApiResponse.success(coupons);
    }
}
