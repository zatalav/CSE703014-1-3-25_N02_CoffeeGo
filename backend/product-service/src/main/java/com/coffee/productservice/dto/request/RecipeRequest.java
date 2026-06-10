package com.coffee.productservice.dto.request;

import jakarta.validation.constraints.Size;

public class RecipeRequest {

    private Long productId;

    @Size(max = 255)
    private String recipeName;

    private String description;

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getRecipeName() {
        return recipeName;
    }

    public void setRecipeName(String recipeName) {
        this.recipeName = recipeName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

}
