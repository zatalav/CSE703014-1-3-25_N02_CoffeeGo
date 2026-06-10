package com.coffee.customerservice.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class DripsExchangeHistoryRequest {

    @NotNull
    private Long voucherId;

    @NotNull
    private Long customerId;

    @NotNull
    private Long couponId;

    @NotNull
    private Integer dripsSpent;

    private LocalDateTime exchangedAt;

    public Long getVoucherId() {
        return voucherId;
    }

    public void setVoucherId(Long voucherId) {
        this.voucherId = voucherId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getCouponId() {
        return couponId;
    }

    public void setCouponId(Long couponId) {
        this.couponId = couponId;
    }

    public Integer getDripsSpent() {
        return dripsSpent;
    }

    public void setDripsSpent(Integer dripsSpent) {
        this.dripsSpent = dripsSpent;
    }

    public LocalDateTime getExchangedAt() {
        return exchangedAt;
    }

    public void setExchangedAt(LocalDateTime exchangedAt) {
        this.exchangedAt = exchangedAt;
    }

}
