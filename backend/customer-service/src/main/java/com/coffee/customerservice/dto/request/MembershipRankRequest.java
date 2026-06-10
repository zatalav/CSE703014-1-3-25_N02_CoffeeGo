package com.coffee.customerservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class MembershipRankRequest {

    @NotBlank
    @Size(max = 50)
    private String rankName;

    @NotNull
    private Integer rankOrder;

    @NotNull
    private Integer minExp;

    private Long minTotalMoney;

    private Integer minTotalOrders;

    @NotNull
    private Integer discountPercent;

    @NotNull
    private Double expMultiplier;

    @NotNull
    private Double dripsMultiplier;

    private String description;

    private String status;

    @Size(max = 20)
    private String color;

    @Size(max = 20)
    private String icon;

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

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

}
