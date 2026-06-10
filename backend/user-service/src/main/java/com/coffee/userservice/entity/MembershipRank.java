package com.coffee.userservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "Membership_rank")
public class MembershipRank {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rank_id", nullable = false)
    private Long rankId;

    @Column(name = "rank_name", nullable = false, unique = true, length = 50)
    private String rankName;

    @Column(name = "rank_order", nullable = false, unique = true)
    private Integer rankOrder;

    @Column(name = "min_exp", nullable = false)
    private Integer minExp;

    @Column(name = "min_total_money", nullable = false)
    private Long minTotalMoney;

    @Column(name = "min_total_orders", nullable = false)
    private Integer minTotalOrders;

    @Column(name = "discount_percent", nullable = false)
    private Integer discountPercent;

    @Column(name = "exp_multiplier", nullable = false)
    private Double expMultiplier;

    @Column(name = "drips_multiplier", nullable = false)
    private Double dripsMultiplier;

    @Lob
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "status")
    private String status;

    public MembershipRank() {}

    public Long getRankId() {
        return rankId;
    }

    public void setRankId(Long rankId) {
        this.rankId = rankId;
    }

    public String getRankName() {
        return rankName;
    }

    public void setRankName(String rankName) {
        this.rankName = rankName;
    }

    public Integer getRankOrder() {
        return rankOrder;
    }

    public void setRankOrder(Integer rankOrder) {
        this.rankOrder = rankOrder;
    }

    public Integer getMinExp() {
        return minExp;
    }

    public void setMinExp(Integer minExp) {
        this.minExp = minExp;
    }

    public Long getMinTotalMoney() {
        return minTotalMoney;
    }

    public void setMinTotalMoney(Long minTotalMoney) {
        this.minTotalMoney = minTotalMoney;
    }

    public Integer getMinTotalOrders() {
        return minTotalOrders;
    }

    public void setMinTotalOrders(Integer minTotalOrders) {
        this.minTotalOrders = minTotalOrders;
    }

    public Integer getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(Integer discountPercent) {
        this.discountPercent = discountPercent;
    }

    public Double getExpMultiplier() {
        return expMultiplier;
    }

    public void setExpMultiplier(Double expMultiplier) {
        this.expMultiplier = expMultiplier;
    }

    public Double getDripsMultiplier() {
        return dripsMultiplier;
    }

    public void setDripsMultiplier(Double dripsMultiplier) {
        this.dripsMultiplier = dripsMultiplier;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

}
