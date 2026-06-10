package com.coffee.inventoryservice.dto.response;

import java.time.LocalDate;

public class StockImportDetailResponse {

    private Long importDetailId;

    private Long importId;

    private Long ingredientId;

    private Double quantity;

    private String unit;

    private Long unitPrice;

    private LocalDate expiryDate;

    public Long getImportDetailId() {
        return importDetailId;
    }

    public void setImportDetailId(Long importDetailId) {
        this.importDetailId = importDetailId;
    }

    public Long getImportId() {
        return importId;
    }

    public void setImportId(Long importId) {
        this.importId = importId;
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

    public Long getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Long unitPrice) {
        this.unitPrice = unitPrice;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

}
