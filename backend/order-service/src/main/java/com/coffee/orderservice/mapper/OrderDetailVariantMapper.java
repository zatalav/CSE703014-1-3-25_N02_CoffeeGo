package com.coffee.orderservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.orderservice.entity.OrderDetailVariant;
import com.coffee.orderservice.dto.request.OrderDetailVariantRequest;
import com.coffee.orderservice.dto.response.OrderDetailVariantResponse;
import org.springframework.stereotype.Component;

@Component
public class OrderDetailVariantMapper implements DtoMapper<OrderDetailVariant, OrderDetailVariantRequest, OrderDetailVariantResponse> {
    @Override
    public OrderDetailVariant toEntity(OrderDetailVariantRequest request) {
        OrderDetailVariant entity = new OrderDetailVariant();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(OrderDetailVariant entity, OrderDetailVariantRequest request) {
        if (request == null) {
            return;
        }
        entity.setOrderDetailId(request.getOrderDetailId());
        entity.setVariantId(request.getVariantId());
        entity.setExtraPrice(request.getExtraPrice());
    }

    @Override
    public OrderDetailVariantResponse toResponse(OrderDetailVariant entity) {
        if (entity == null) {
            return null;
        }
        OrderDetailVariantResponse response = new OrderDetailVariantResponse();
        response.setOrderDetailId(entity.getOrderDetailId());
        response.setVariantId(entity.getVariantId());
        response.setExtraPrice(entity.getExtraPrice());
        return response;
    }
}
