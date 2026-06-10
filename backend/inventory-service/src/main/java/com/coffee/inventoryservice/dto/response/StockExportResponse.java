package com.coffee.inventoryservice.dto.response;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class StockExportResponse {

    private Long exportId;

    private Long fromBranchId;

    private Long toBranchId;

    private Long employeeId;

    private String note;

    private Long totalAmount;

    private LocalDateTime exportedAt;

    private List<StockExportDetailResponse> details = new ArrayList<>();

    public Long getExportId() {
        return exportId;
    }

    public void setExportId(Long exportId) {
        this.exportId = exportId;
    }

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

    public List<StockExportDetailResponse> getDetails() {
        return details;
    }

    public void setDetails(List<StockExportDetailResponse> details) {
        this.details = details == null ? new ArrayList<>() : details;
    }

}
