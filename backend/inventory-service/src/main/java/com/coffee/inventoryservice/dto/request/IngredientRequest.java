package com.coffee.inventoryservice.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class IngredientRequest {

    @JsonProperty("iCategoryId")
    @JsonAlias({"icategoryId", "ICategoryId"})
    private Long iCategoryId;

    @NotBlank
    @Size(max = 255)
    private String ingredientName;

    private String unit;

    private Long toppingPrice;

    private String status;

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
