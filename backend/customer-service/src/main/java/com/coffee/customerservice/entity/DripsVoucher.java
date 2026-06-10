package com.coffee.customerservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "Drips_voucher")
public class DripsVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    @Column(name = "coupon_id", nullable = false)
    private Long couponId;

    @Column(name = "drips_required", nullable = false)
    private Integer dripsRequired;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "exchanged")
    private Integer exchanged;

    @Column(name = "status")
    private String status;

    public DripsVoucher() {}

    public Long getVoucherId() {
        return voucherId;
    }

    public void setVoucherId(Long voucherId) {
        this.voucherId = voucherId;
    }

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
