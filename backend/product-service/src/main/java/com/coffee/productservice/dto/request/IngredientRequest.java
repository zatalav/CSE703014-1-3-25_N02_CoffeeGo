package com.coffee.productservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class IngredientRequest {

    private Long iCategoryId;

    @NotBlank
    @Size(max = 255)
    private String ingredientName;

    private String unit;

    private Long toppingPrice;

    private String status;

    public Long getICategoryId() {
        return iCategoryId;
    }

    public void setICategoryId(Long iCategoryId) {
        this.iCategoryId = iCategoryId;
    }

    public String getIngredientName() {
        return ingredientName;
    }

    public void setIngredientName(String ingredientName) {
        this.ingredientName = ingredientName;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Long getToppingPrice() {
        return toppingPrice;
    }

    public void setToppingPrice(Long toppingPrice) {
        this.toppingPrice = toppingPrice;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

}
