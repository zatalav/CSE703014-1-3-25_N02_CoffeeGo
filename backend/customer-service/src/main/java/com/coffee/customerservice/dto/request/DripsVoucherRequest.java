package com.coffee.customerservice.dto.request;

import jakarta.validation.constraints.NotNull;

public class DripsVoucherRequest {

    @NotNull
    private Long couponId;

    @NotNull
    private Integer dripsRequired;

    @NotNull
    private Integer quantity;

    private Integer exchanged;

    private String status;

    public Long getCouponId() {
        return couponId;
    }

    public void setCouponId(Long couponId) {
        this.couponId = couponId;
    }

    public Integer getDripsRequired() {
        return dripsRequired;
    }

    public void setDripsRequired(Integer dripsRequired) {
        this.dripsRequired = dripsRequired;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getExchanged() {
        return exchanged;
    }

    public void setExchanged(Integer exchanged) {
        this.exchanged = exchanged;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

}
