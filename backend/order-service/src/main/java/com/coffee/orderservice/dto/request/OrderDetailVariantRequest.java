package com.coffee.orderservice.dto.request;

import jakarta.validation.constraints.NotNull;

public class OrderDetailVariantRequest {

    private Long orderDetailId;

    private Long variantId;

    @NotNull
    private Long extraPrice;

    public Long getOrderDetailId() {
        return orderDetailId;
    }

    public void setOrderDetailId(Long orderDetailId) {
        this.orderDetailId = orderDetailId;
    }

    public Long getVariantId() {
        return variantId;
    }

    public void setVariantId(Long variantId) {
        this.variantId = variantId;
    }

    public Long getExtraPrice() {
        return extraPrice;
    }

    public void setExtraPrice(Long extraPrice) {
        this.extraPrice = extraPrice;
    }

}
