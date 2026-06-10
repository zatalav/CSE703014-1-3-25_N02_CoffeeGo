package com.coffee.productservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class VariantRequest {

    @NotBlank
    private String variantGroup;

    @NotBlank
    @Size(max = 100)
    private String variantLabel;

    private Long extraPrice;

    private String status;

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
