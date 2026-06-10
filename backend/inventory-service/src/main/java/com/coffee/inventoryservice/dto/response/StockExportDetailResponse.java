package com.coffee.inventoryservice.dto.response;

public class StockExportDetailResponse {

    private Long exportDetailId;

    private Long exportId;

    private Long ingredientId;

    private Double quantity;

    private String unit;

    private Long unitPrice;

    public Long getExportDetailId() {
        return exportDetailId;
    }

    public void setExportDetailId(Long exportDetailId) {
        this.exportDetailId = exportDetailId;
    }

    public Long getExportId() {
        return exportId;
    }

    public void setExportId(Long exportId) {
        this.exportId = exportId;
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

}
