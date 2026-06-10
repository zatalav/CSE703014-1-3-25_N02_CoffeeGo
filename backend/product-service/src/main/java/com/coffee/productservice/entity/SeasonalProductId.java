package com.coffee.productservice.entity;

import java.io.Serializable;
import java.util.Objects;

public class SeasonalProductId implements Serializable {
    private Long seasonId;
    private Long productId;

    public SeasonalProductId() {}

    public Long getSeasonId() {
        return seasonId;
    }

    public void setSeasonId(Long seasonId) {
        this.seasonId = seasonId;
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
        SeasonalProductId that = (SeasonalProductId) o;
        return Objects.equals(seasonId, that.seasonId) && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(seasonId, productId);
    }
}
