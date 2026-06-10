package com.coffee.promotionservice.controller;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.promotionservice.repository.CouponUsageRepository;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/promotions/coupons")
    @PreAuthorize("hasRole('admin')")
    public class CouponUsageController {
        private final CouponUsageRepository couponUsageRepository;

        public CouponUsageController(CouponUsageRepository couponUsageRepository) {
            this.couponUsageRepository = couponUsageRepository;
        }

        @GetMapping("/{id}/usages")
        public ApiResponse<?> usages(@PathVariable Long id) {
            return ApiResponse.success(couponUsageRepository.findAll().stream().filter(item -> id.equals(item.getCouponId())).toList());
        }
    }
