package com.coffee.promotionservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.promotionservice.entity.Coupon;
import com.coffee.promotionservice.dto.request.CouponRequest;
import com.coffee.promotionservice.dto.response.CouponResponse;
import org.springframework.stereotype.Component;

@Component
public class CouponMapper implements DtoMapper<Coupon, CouponRequest, CouponResponse> {
    @Override
    public Coupon toEntity(CouponRequest request) {
        Coupon entity = new Coupon();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Coupon entity, CouponRequest request) {
        if (request == null) {
            return;
        }
        entity.setMinRankId(request.getMinRankId());
        entity.setCode(request.getCode());
        entity.setDescription(request.getDescription());
        entity.setDiscountType(request.getDiscountType());
        entity.setDiscountValue(request.getDiscountValue());
        entity.setMaxDiscount(request.getMaxDiscount());
        entity.setMinOrderValue(request.getMinOrderValue());
        entity.setApplyFor(request.getApplyFor());
        entity.setUsageLimit(request.getUsageLimit());
        entity.setUsedCount(request.getUsedCount());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setStatus(request.getStatus());
    }

    @Override
    public CouponResponse toResponse(Coupon entity) {
        if (entity == null) {
            return null;
        }
        CouponResponse response = new CouponResponse();
        response.setCouponId(entity.getCouponId());
        response.setMinRankId(entity.getMinRankId());
        response.setCode(entity.getCode());
        response.setDescription(entity.getDescription());
        response.setDiscountType(entity.getDiscountType());
        response.setDiscountValue(entity.getDiscountValue());
        response.setMaxDiscount(entity.getMaxDiscount());
        response.setMinOrderValue(entity.getMinOrderValue());
        response.setApplyFor(entity.getApplyFor());
        response.setUsageLimit(entity.getUsageLimit());
        response.setUsedCount(entity.getUsedCount());
        response.setStartDate(entity.getStartDate());
        response.setEndDate(entity.getEndDate());
        response.setStatus(entity.getStatus());
        return response;
    }
}
