package com.coffee.productservice.dto.response;

public class VariantResponse {

    private Long variantId;

    private String variantGroup;

    private String variantLabel;

    private Long extraPrice;

    private String status;

    public Long getVariantId() {
        return variantId;
    }

    public void setVariantId(Long variantId) {
        this.variantId = variantId;
    }

    public String getVariantGroup() {
        return variantGroup;
    }

    public void setVariantGroup(String variantGroup) {
        this.variantGroup = variantGroup;
    }

    public String getVariantLabel() {
        return variantLabel;
    }

    public void setVariantLabel(String variantLabel) {
        this.variantLabel = variantLabel;
    }

    public Long getExtraPrice() {
        return extraPrice;
    }

    public void setExtraPrice(Long extraPrice) {
        this.extraPrice = extraPrice;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

}
