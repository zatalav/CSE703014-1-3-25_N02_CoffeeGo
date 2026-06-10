package com.coffee.userservice.dto.response;

public class MembershipRankResponse {

    private Long rankId;

    private String rankName;

    private Integer rankOrder;

    private Integer minExp;

    private Long minTotalMoney;

    private Integer minTotalOrders;

    private Integer discountPercent;

    private Double expMultiplier;

    private Double dripsMultiplier;

    private String description;

    private String status;

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
