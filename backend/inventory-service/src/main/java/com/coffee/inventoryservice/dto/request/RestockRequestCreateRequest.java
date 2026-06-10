package com.coffee.inventoryservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

public class RestockRequestCreateRequest {

    @NotNull
    private Long branchId;

    @NotNull
    private Long employeeId;

    private String note;

    @Valid
    @NotEmpty
    private List<RestockRequestItemRequest> items = new ArrayList<>();

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

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public List<RestockRequestItemRequest> getItems() {
        return items;
    }

    public void setItems(List<RestockRequestItemRequest> items) {
        this.items = items == null ? new ArrayList<>() : items;
    }
}
