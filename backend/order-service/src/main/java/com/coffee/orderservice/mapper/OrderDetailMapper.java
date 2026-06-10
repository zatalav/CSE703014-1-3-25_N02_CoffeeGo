package com.coffee.orderservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.orderservice.entity.OrderDetail;
import com.coffee.orderservice.dto.request.OrderDetailRequest;
import com.coffee.orderservice.dto.response.OrderDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class OrderDetailMapper implements DtoMapper<OrderDetail, OrderDetailRequest, OrderDetailResponse> {
    @Override
    public OrderDetail toEntity(OrderDetailRequest request) {
        OrderDetail entity = new OrderDetail();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(OrderDetail entity, OrderDetailRequest request) {
        if (request == null) {
            return;
        }
        entity.setOrderId(request.getOrderId());
        entity.setProductId(request.getProductId());
        entity.setComboId(request.getComboId());
        entity.setQuantity(request.getQuantity());
        entity.setUnitPrice(request.getUnitPrice());
        entity.setNote(request.getNote());
        entity.setSizeId(request.getSizeId());
    }

    @Override
    public OrderDetailResponse toResponse(OrderDetail entity) {
        if (entity == null) {
            return null;
        }
        OrderDetailResponse response = new OrderDetailResponse();
        response.setOrderDetailId(entity.getOrderDetailId());
        response.setOrderId(entity.getOrderId());
        response.setProductId(entity.getProductId());
        response.setComboId(entity.getComboId());
        response.setQuantity(entity.getQuantity());
        response.setUnitPrice(entity.getUnitPrice());
        response.setNote(entity.getNote());
        response.setSizeId(entity.getSizeId());
        return response;
    }
}
