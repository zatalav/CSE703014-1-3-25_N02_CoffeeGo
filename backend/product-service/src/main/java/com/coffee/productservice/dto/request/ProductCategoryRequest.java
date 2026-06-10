package com.coffee.productservice.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

public class ProductCategoryRequest {

    @Size(max = 255)
    @JsonProperty("pCategoryName")
    @JsonAlias({"pcategoryName", "PCategoryName"})
    private String pCategoryName;

    @JsonProperty("pCategoryName")
    public String getPCategoryName() {
        return pCategoryName;
    }

    @JsonProperty("pCategoryName")
    public void setPCategoryName(String pCategoryName) {
        this.pCategoryName = pCategoryName;
    }

}
