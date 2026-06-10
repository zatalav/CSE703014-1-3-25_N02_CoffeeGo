package com.coffee.productservice.dto.request;

import jakarta.validation.constraints.NotNull;

public class ComboDetailRequest {

    private Long comboId;

    @NotNull
    private Long productId;

    @NotNull
    private Integer quantity;

    public Long getComboId() {
        return comboId;
    }

    public void setComboId(Long comboId) {
        this.comboId = comboId;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

}
