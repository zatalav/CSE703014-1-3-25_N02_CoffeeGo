package com.coffee.productservice.entity;

import java.io.Serializable;
import java.util.Objects;

public class ProductToppingId implements Serializable {
    private Long productId;
    private Long ingredientId;

    public ProductToppingId() {}

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
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
        if (!(o instanceof ProductToppingId that)) return false;
        return Objects.equals(productId, that.productId) && Objects.equals(ingredientId, that.ingredientId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId, ingredientId);
    }
}
