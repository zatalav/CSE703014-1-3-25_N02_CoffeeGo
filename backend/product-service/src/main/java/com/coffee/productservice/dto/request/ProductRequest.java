package com.coffee.productservice.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class ProductRequest {

    @JsonProperty("pCategoryId")
    @JsonAlias({"pcategoryId", "PCategoryId"})
    private Long pCategoryId;

    @Size(max = 255)
    private String productName;

    private String description;

    private Long basePrice;

    private String productType;

    @Size(max = 255)
    private String imgUrl;

    private String status;

    private LocalDateTime createdAt;

    @JsonProperty("pCategoryId")
    public Long getPCategoryId() {
        return pCategoryId;
    }

    @JsonProperty("pCategoryId")
    public void setPCategoryId(Long pCategoryId) {
        this.pCategoryId = pCategoryId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(Long basePrice) {
        this.basePrice = basePrice;
    }

    public String getProductType() {
        return productType;
    }

    public void setProductType(String productType) {
        this.productType = productType;
    }

    public String getImgUrl() {
        return imgUrl;
    }

    public void setImgUrl(String imgUrl) {
        this.imgUrl = imgUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

}
