package com.coffee.inventoryservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "Ingredient_category")
public class IngredientCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "i_category_id", nullable = false)
    private Long iCategoryId;

    @Column(name = "i_category_name", length = 255)
    private String iCategoryName;

    public IngredientCategory() {}

    public Long getICategoryId() {
        return iCategoryId;
    }

    public void setICategoryId(Long iCategoryId) {
        this.iCategoryId = iCategoryId;
    }

    public String getICategoryName() {
        return iCategoryName;
    }

    public void setICategoryName(String iCategoryName) {
        this.iCategoryName = iCategoryName;
    }

}
