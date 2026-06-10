package com.coffee.inventoryservice.entity;

import java.io.Serializable;
import java.util.Objects;

public class SupplierIngredientId implements Serializable {
    private Long supplierId;
    private Long ingredientId;

    public SupplierIngredientId() {}

    public Long getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(Long supplierId) {
        this.supplierId = supplierId;
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
        SupplierIngredientId that = (SupplierIngredientId) o;
        return Objects.equals(supplierId, that.supplierId) && Objects.equals(ingredientId, that.ingredientId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(supplierId, ingredientId);
    }
}
