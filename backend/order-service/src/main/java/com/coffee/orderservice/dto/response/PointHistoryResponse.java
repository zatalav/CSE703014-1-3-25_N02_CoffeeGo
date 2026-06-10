package com.coffee.orderservice.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PointHistoryResponse {

    private Long historyId;

    private Long customerId;

    private Long orderId;

    private String pointType;

    private String action;

    private Integer amount;

    private Integer remainingAmount;

    private LocalDate earnedMonth;

    private LocalDate expiredAt;

    private String status;

    private Long refHistoryId;

    private String note;

    private LocalDateTime createdAt;

    public Long getHistoryId() {
        return historyId;
    }

    public void setHistoryId(Long historyId) {
        this.historyId = historyId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getPointType() {
        return pointType;
    }

    public void setPointType(String pointType) {
        this.pointType = pointType;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public Integer getRemainingAmount() {
        return remainingAmount;
    }

    public void setRemainingAmount(Integer remainingAmount) {
        this.remainingAmount = remainingAmount;
    }

    public LocalDate getEarnedMonth() {
        return earnedMonth;
    }

    public void setEarnedMonth(LocalDate earnedMonth) {
        this.earnedMonth = earnedMonth;
    }

    public LocalDate getExpiredAt() {
        return expiredAt;
    }

    public void setExpiredAt(LocalDate expiredAt) {
        this.expiredAt = expiredAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getRefHistoryId() {
        return refHistoryId;
    }

    public void setRefHistoryId(Long refHistoryId) {
        this.refHistoryId = refHistoryId;
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

}
