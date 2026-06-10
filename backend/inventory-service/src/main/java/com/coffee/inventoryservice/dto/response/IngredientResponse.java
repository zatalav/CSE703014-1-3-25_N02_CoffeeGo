package com.coffee.inventoryservice.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public class IngredientResponse {

    private Long ingredientId;

    private Long iCategoryId;

    private String ingredientName;

    private String unit;

    private Long toppingPrice;

    private String status;

    public Long getIngredientId() {
        return ingredientId;
    }

    public void setIngredientId(Long ingredientId) {
        this.ingredientId = ingredientId;
    }

    @JsonProperty("iCategoryId")
    public Long getICategoryId() {
        return iCategoryId;
    }

    @JsonProperty("iCategoryId")
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
