package com.coffee.orderservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "Order_detail_variant")
@IdClass(OrderDetailVariantId.class)
public class OrderDetailVariant {

    @Id
    @Column(name = "order_detail_id", nullable = false)
    private Long orderDetailId;

    @Id
    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "extra_price", nullable = false)
    private Long extraPrice;

    public OrderDetailVariant() {}

    public Long getOrderDetailId() {
        return orderDetailId;
    }

    public void setOrderDetailId(Long orderDetailId) {
        this.orderDetailId = orderDetailId;
    }

    public Long getVariantId() {
        return variantId;
    }

    public void setVariantId(Long variantId) {
        this.variantId = variantId;
    }

    public Long getExtraPrice() {
        return extraPrice;
    }

    public void setExtraPrice(Long extraPrice) {
        this.extraPrice = extraPrice;
    }

}
