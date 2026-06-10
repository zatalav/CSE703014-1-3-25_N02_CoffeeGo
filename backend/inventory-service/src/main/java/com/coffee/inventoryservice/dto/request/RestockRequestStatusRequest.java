package com.coffee.inventoryservice.dto.request;

import jakarta.validation.constraints.NotBlank;

public class RestockRequestStatusRequest {

    @NotBlank
    private String status;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
