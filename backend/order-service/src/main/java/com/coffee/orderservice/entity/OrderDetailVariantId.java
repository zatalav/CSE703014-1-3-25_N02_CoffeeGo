package com.coffee.orderservice.entity;

import java.io.Serializable;
import java.util.Objects;

public class OrderDetailVariantId implements Serializable {
    private Long orderDetailId;
    private Long variantId;

    public OrderDetailVariantId() {}

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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OrderDetailVariantId that = (OrderDetailVariantId) o;
        return Objects.equals(orderDetailId, that.orderDetailId) && Objects.equals(variantId, that.variantId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderDetailId, variantId);
    }
}
