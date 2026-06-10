package com.coffee.productservice.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ProductCategoryResponse {

    private Long pCategoryId;

    private String pCategoryName;

    @JsonProperty("pCategoryId")
    public Long getPCategoryId() {
        return pCategoryId;
    }

    public void setPCategoryId(Long pCategoryId) {
        this.pCategoryId = pCategoryId;
    }

    @JsonProperty("pCategoryName")
    public String getPCategoryName() {
        return pCategoryName;
    }

    public void setPCategoryName(String pCategoryName) {
        this.pCategoryName = pCategoryName;
    }

}
