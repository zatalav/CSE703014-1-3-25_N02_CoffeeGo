package com.coffee.productservice.entity;

import java.io.Serializable;
import java.util.Objects;

public class ProductVariantId implements Serializable {
    private Long productId;
    private Long variantId;

    public ProductVariantId() {}

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
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
        ProductVariantId that = (ProductVariantId) o;
        return Objects.equals(productId, that.productId) && Objects.equals(variantId, that.variantId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId, variantId);
    }
}
