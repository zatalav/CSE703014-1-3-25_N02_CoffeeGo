package com.coffee.promotionservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.promotionservice.entity.CouponUsage;
import com.coffee.promotionservice.dto.request.CouponUsageRequest;
import com.coffee.promotionservice.dto.response.CouponUsageResponse;
import org.springframework.stereotype.Component;

@Component
public class CouponUsageMapper implements DtoMapper<CouponUsage, CouponUsageRequest, CouponUsageResponse> {
    @Override
    public CouponUsage toEntity(CouponUsageRequest request) {
        CouponUsage entity = new CouponUsage();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(CouponUsage entity, CouponUsageRequest request) {
        if (request == null) {
            return;
        }
        entity.setCouponId(request.getCouponId());
        entity.setCustomerId(request.getCustomerId());
        entity.setOrderId(request.getOrderId());
        entity.setUsedAt(request.getUsedAt());
    }

    @Override
    public CouponUsageResponse toResponse(CouponUsage entity) {
        if (entity == null) {
            return null;
        }
        CouponUsageResponse response = new CouponUsageResponse();
        response.setUsageId(entity.getUsageId());
        response.setCouponId(entity.getCouponId());
        response.setCustomerId(entity.getCustomerId());
        response.setOrderId(entity.getOrderId());
        response.setUsedAt(entity.getUsedAt());
        return response;
    }
}
