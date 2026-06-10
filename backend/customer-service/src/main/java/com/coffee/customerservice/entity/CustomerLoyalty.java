package com.coffee.customerservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "Customer_loyalty")
public class CustomerLoyalty {

    @Id
    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "rank_id", nullable = false)
    private Long rankId;

    @Column(name = "exp_point")
    private Integer expPoint;

    @Column(name = "drips_point")
    private Integer dripsPoint;

    @Column(name = "total_money")
    private Long totalMoney;

    @Column(name = "total_orders")
    private Integer totalOrders;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public CustomerLoyalty() {}

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
