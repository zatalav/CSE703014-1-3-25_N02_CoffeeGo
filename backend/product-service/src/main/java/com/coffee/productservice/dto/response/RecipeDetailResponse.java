package com.coffee.productservice.dto.response;

public class RecipeDetailResponse {

    private Long recipeDetailId;

    private Long recipeId;

    private Long ingredientId;

    private Double quantity;

    private String unit;

    private String size;

    private Long estimatedTotal;

    public Long getRecipeDetailId() {
        return recipeDetailId;
    }

    public void setRecipeDetailId(Long recipeDetailId) {
        this.recipeDetailId = recipeDetailId;
    }

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
