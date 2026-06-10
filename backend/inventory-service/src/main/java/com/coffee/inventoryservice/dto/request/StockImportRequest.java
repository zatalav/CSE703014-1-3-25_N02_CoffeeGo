package com.coffee.inventoryservice.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class StockImportRequest {

    @NotNull
    private Long branchId;

    @NotNull
    private Long supplierId;

    @NotNull
    private Long employeeId;

    @NotNull
    private Long totalAmount;

    private String note;

    private LocalDateTime importedAt;

    private List<StockImportDetailRequest> details = new ArrayList<>();

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Long getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(Long supplierId) {
        this.supplierId = supplierId;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public Long getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Long totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getImportedAt() {
        return importedAt;
    }

    public void setImportedAt(LocalDateTime importedAt) {
        this.importedAt = importedAt;
    }

    public List<StockImportDetailRequest> getDetails() {
        return details;
    }

    public void setDetails(List<StockImportDetailRequest> details) {
        this.details = details == null ? new ArrayList<>() : details;
    }

}
