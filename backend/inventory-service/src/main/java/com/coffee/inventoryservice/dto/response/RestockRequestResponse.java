package com.coffee.inventoryservice.dto.response;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class RestockRequestResponse {

    private Long requestId;

    private Long branchId;

    private Long employeeId;

    private String status;

    private String note;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private List<RestockRequestDetailResponse> items = new ArrayList<>();

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<RestockRequestDetailResponse> getItems() {
        return items;
    }

    public void setItems(List<RestockRequestDetailResponse> items) {
        this.items = items == null ? new ArrayList<>() : items;
    }
}
