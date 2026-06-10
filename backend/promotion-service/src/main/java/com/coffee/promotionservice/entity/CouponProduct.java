package com.coffee.promotionservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "Coupon_product")
@IdClass(CouponProductId.class)
public class CouponProduct {

    @Id
    @Column(name = "coupon_id", nullable = false)
    private Long couponId;

    @Id
    @Column(name = "product_id", nullable = false)
    private Long productId;

    public CouponProduct() {}

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

}
