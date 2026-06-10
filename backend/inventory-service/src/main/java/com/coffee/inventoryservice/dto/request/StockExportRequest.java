package com.coffee.inventoryservice.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class StockExportRequest {

    @NotNull
    private Long fromBranchId;

    @NotNull
    private Long toBranchId;

    @NotNull
    private Long employeeId;

    private String note;

    @NotNull
    private Long totalAmount;

    private LocalDateTime exportedAt;

    private List<StockExportDetailRequest> details = new ArrayList<>();

    public Long getFromBranchId() {
        return fromBranchId;
    }

    public void setFromBranchId(Long fromBranchId) {
        this.fromBranchId = fromBranchId;
    }

    public Long getToBranchId() {
        return toBranchId;
    }

    public void setToBranchId(Long toBranchId) {
        this.toBranchId = toBranchId;
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

    public Long getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Long totalAmount) {
        this.totalAmount = totalAmount;
    }

    public LocalDateTime getExportedAt() {
        return exportedAt;
    }

    public void setExportedAt(LocalDateTime exportedAt) {
        this.exportedAt = exportedAt;
    }

    public List<StockExportDetailRequest> getDetails() {
        return details;
    }

    public void setDetails(List<StockExportDetailRequest> details) {
        this.details = details == null ? new ArrayList<>() : details;
    }

}
