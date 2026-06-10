package com.coffee.productservice.entity;

import java.io.Serializable;
import java.util.Objects;

public class ComboDetailId implements Serializable {
    private Long comboId;
    private Long productId;

    public ComboDetailId() {}

    public Long getComboId() {
        return comboId;
    }

    public void setComboId(Long comboId) {
        this.comboId = comboId;
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
        ComboDetailId that = (ComboDetailId) o;
        return Objects.equals(comboId, that.comboId) && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(comboId, productId);
    }
}
