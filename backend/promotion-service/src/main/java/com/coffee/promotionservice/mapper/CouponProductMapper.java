package com.coffee.promotionservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.promotionservice.entity.CouponProduct;
import com.coffee.promotionservice.dto.request.CouponProductRequest;
import com.coffee.promotionservice.dto.response.CouponProductResponse;
import org.springframework.stereotype.Component;

@Component
public class CouponProductMapper implements DtoMapper<CouponProduct, CouponProductRequest, CouponProductResponse> {
    @Override
    public CouponProduct toEntity(CouponProductRequest request) {
        CouponProduct entity = new CouponProduct();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(CouponProduct entity, CouponProductRequest request) {
        if (request == null) {
            return;
        }
        entity.setCouponId(request.getCouponId());
        entity.setProductId(request.getProductId());
    }

    @Override
    public CouponProductResponse toResponse(CouponProduct entity) {
        if (entity == null) {
            return null;
        }
        CouponProductResponse response = new CouponProductResponse();
        response.setCouponId(entity.getCouponId());
        response.setProductId(entity.getProductId());
        return response;
    }
}
