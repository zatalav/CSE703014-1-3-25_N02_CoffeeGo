package com.coffee.promotionservice.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class CouponUsageRequest {

    @NotNull
    private Long couponId;

    @NotNull
    private Long customerId;

    private Long orderId;

    private LocalDateTime usedAt;

    public Long getCouponId() {
        return couponId;
    }

    public void setCouponId(Long couponId) {
        this.couponId = couponId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }

}
