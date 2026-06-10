package com.coffee.promotionservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.promotionservice.entity.OrderEntity;
import com.coffee.promotionservice.dto.request.OrderEntityRequest;
import com.coffee.promotionservice.dto.response.OrderEntityResponse;
import org.springframework.stereotype.Component;

@Component
public class OrderEntityMapper implements DtoMapper<OrderEntity, OrderEntityRequest, OrderEntityResponse> {
    @Override
    public OrderEntity toEntity(OrderEntityRequest request) {
        OrderEntity entity = new OrderEntity();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(OrderEntity entity, OrderEntityRequest request) {
        if (request == null) {
            return;
        }
        entity.setCustomerId(request.getCustomerId());
        entity.setEmployeeId(request.getEmployeeId());
        entity.setBranchId(request.getBranchId());
        entity.setCouponId(request.getCouponId());
        entity.setOrderType(request.getOrderType());
        entity.setStatus(request.getStatus());
        entity.setNote(request.getNote());
        entity.setCreatedAt(request.getCreatedAt());
        entity.setUpdatedAt(request.getUpdatedAt());
    }

    @Override
    public OrderEntityResponse toResponse(OrderEntity entity) {
        if (entity == null) {
            return null;
        }
        OrderEntityResponse response = new OrderEntityResponse();
        response.setOrderId(entity.getOrderId());
        response.setCustomerId(entity.getCustomerId());
        response.setEmployeeId(entity.getEmployeeId());
        response.setBranchId(entity.getBranchId());
        response.setCouponId(entity.getCouponId());
        response.setOrderType(entity.getOrderType());
        response.setStatus(entity.getStatus());
        response.setNote(entity.getNote());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }
}
