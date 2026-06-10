package com.coffee.userservice.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class CustomerLoyaltyRequest {

    private Long customerId;

    @NotNull
    private Long rankId;

    private Integer expPoint;

    private Integer dripsPoint;

    private Long totalMoney;

    private Integer totalOrders;

    private LocalDateTime updatedAt;

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getRankId() {
        return rankId;
    }

    public void setRankId(Long rankId) {
        this.rankId = rankId;
    }

    public Integer getExpPoint() {
        return expPoint;
    }

    public void setExpPoint(Integer expPoint) {
        this.expPoint = expPoint;
    }

    public Integer getDripsPoint() {
        return dripsPoint;
    }

    public void setDripsPoint(Integer dripsPoint) {
        this.dripsPoint = dripsPoint;
    }

    public Long getTotalMoney() {
        return totalMoney;
    }

    public void setTotalMoney(Long totalMoney) {
        this.totalMoney = totalMoney;
    }

    public Integer getTotalOrders() {
        return totalOrders;
    }

    public void setTotalOrders(Integer totalOrders) {
        this.totalOrders = totalOrders;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

}
