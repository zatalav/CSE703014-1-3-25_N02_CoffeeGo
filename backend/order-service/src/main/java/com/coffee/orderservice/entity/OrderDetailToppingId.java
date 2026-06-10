package com.coffee.orderservice.entity;

import java.io.Serializable;
import java.util.Objects;

public class OrderDetailToppingId implements Serializable {
    private Long orderDetailId;
    private Long ingredientId;

    public OrderDetailToppingId() {}

    public Long getOrderDetailId() {
        return orderDetailId;
    }

    public void setOrderDetailId(Long orderDetailId) {
        this.orderDetailId = orderDetailId;
    }

    public Long getIngredientId() {
        return ingredientId;
    }

    public void setIngredientId(Long ingredientId) {
        this.ingredientId = ingredientId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OrderDetailToppingId that = (OrderDetailToppingId) o;
        return Objects.equals(orderDetailId, that.orderDetailId) && Objects.equals(ingredientId, that.ingredientId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderDetailId, ingredientId);
    }
}
