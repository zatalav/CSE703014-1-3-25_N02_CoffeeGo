package com.coffee.productservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "Seasonal_product")
@IdClass(SeasonalProductId.class)
public class SeasonalProduct {

    @Id
    @Column(name = "season_id", nullable = false)
    private Long seasonId;

    @Id
    @Column(name = "product_id", nullable = false)
    private Long productId;

    public SeasonalProduct() {}

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

}
