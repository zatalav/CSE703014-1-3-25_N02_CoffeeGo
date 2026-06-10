package com.coffee.customerservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "Drips_exchange_history")
public class DripsExchangeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "exchange_id", nullable = false)
    private Long exchangeId;

    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "coupon_id", nullable = false)
    private Long couponId;

    @Column(name = "drips_spent", nullable = false)
    private Integer dripsSpent;

    @Column(name = "exchanged_at")
    private LocalDateTime exchangedAt;

    public DripsExchangeHistory() {}

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
