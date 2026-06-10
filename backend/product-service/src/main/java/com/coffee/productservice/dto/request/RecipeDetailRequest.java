package com.coffee.productservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class RecipeDetailRequest {

    @NotNull
    private Long recipeId;

    @NotNull
    private Long ingredientId;

    @NotNull
    private Double quantity;

    @NotBlank
    private String unit;

    @NotBlank
    private String size;

    @NotNull
    private Long estimatedTotal;

    public Long getRecipeId() {
        return recipeId;
    }

    public void setRecipeId(Long recipeId) {
        this.recipeId = recipeId;
    }

    public Long getIngredientId() {
        return ingredientId;
    }

    public void setIngredientId(Long ingredientId) {
        this.ingredientId = ingredientId;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public Long getEstimatedTotal() {
        return estimatedTotal;
    }

    public void setEstimatedTotal(Long estimatedTotal) {
        this.estimatedTotal = estimatedTotal;
    }

}
