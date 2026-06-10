package com.coffee.inventoryservice.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public class IngredientCategoryResponse {

    private Long iCategoryId;

    private String iCategoryName;

    @JsonProperty("iCategoryId")
    public Long getICategoryId() {
        return iCategoryId;
    }

    public void setICategoryId(Long iCategoryId) {
        this.iCategoryId = iCategoryId;
    }

    @JsonProperty("iCategoryName")
    public String getICategoryName() {
        return iCategoryName;
    }

    public void setICategoryName(String iCategoryName) {
        this.iCategoryName = iCategoryName;
    }

}
