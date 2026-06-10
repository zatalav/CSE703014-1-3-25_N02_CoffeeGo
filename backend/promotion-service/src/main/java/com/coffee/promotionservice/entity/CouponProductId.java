package com.coffee.promotionservice.entity;

import java.io.Serializable;
import java.util.Objects;

public class CouponProductId implements Serializable {
    private Long couponId;
    private Long productId;

    public CouponProductId() {}

    public Long getCouponId() {
        return couponId;
    }

    public void setCouponId(Long couponId) {
        this.couponId = couponId;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CouponProductId that = (CouponProductId) o;
        return Objects.equals(couponId, that.couponId) && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(couponId, productId);
    }
}
