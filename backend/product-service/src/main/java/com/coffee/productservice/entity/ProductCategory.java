package com.coffee.productservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "Product_category")
public class ProductCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "p_category_id", nullable = false)
    private Long pCategoryId;

    @Column(name = "p_category_name", length = 255)
    private String pCategoryName;

    public ProductCategory() {}

    public Long getPCategoryId() {
        return pCategoryId;
    }

    public void setPCategoryId(Long pCategoryId) {
        this.pCategoryId = pCategoryId;
    }

    public String getPCategoryName() {
        return pCategoryName;
    }

    public void setPCategoryName(String pCategoryName) {
        this.pCategoryName = pCategoryName;
    }

}
