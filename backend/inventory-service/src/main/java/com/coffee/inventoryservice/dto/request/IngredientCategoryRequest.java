package com.coffee.inventoryservice.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

public class IngredientCategoryRequest {

    @Size(max = 255)
    @JsonProperty("iCategoryName")
    @JsonAlias({"icategoryName", "ICategoryName"})
    private String iCategoryName;

    @JsonProperty("iCategoryName")
    public String getICategoryName() {
        return iCategoryName;
    }

    @JsonProperty("iCategoryName")
    public void setICategoryName(String iCategoryName) {
        this.iCategoryName = iCategoryName;
    }

}
