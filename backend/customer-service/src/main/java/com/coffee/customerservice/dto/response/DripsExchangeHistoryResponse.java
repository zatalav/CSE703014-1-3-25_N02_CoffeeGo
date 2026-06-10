package com.coffee.customerservice.dto.response;

import java.time.LocalDateTime;

public class DripsExchangeHistoryResponse {

    private Long exchangeId;

    private Long voucherId;

    private Long customerId;

    private Long couponId;

    private Integer dripsSpent;

    private LocalDateTime exchangedAt;

    public Long getExchangeId() {
        return exchangeId;
    }

    public void setExchangeId(Long exchangeId) {
        this.exchangeId = exchangeId;
    }

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
