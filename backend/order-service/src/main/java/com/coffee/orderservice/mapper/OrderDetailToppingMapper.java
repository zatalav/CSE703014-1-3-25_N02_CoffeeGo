package com.coffee.orderservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.orderservice.entity.OrderDetailTopping;
import com.coffee.orderservice.dto.request.OrderDetailToppingRequest;
import com.coffee.orderservice.dto.response.OrderDetailToppingResponse;
import org.springframework.stereotype.Component;

@Component
public class OrderDetailToppingMapper implements DtoMapper<OrderDetailTopping, OrderDetailToppingRequest, OrderDetailToppingResponse> {
    @Override
    public OrderDetailTopping toEntity(OrderDetailToppingRequest request) {
        OrderDetailTopping entity = new OrderDetailTopping();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(OrderDetailTopping entity, OrderDetailToppingRequest request) {
        if (request == null) {
            return;
        }
        entity.setOrderDetailId(request.getOrderDetailId());
        entity.setIngredientId(request.getIngredientId());
        entity.setQuantity(request.getQuantity());
        entity.setToppingPrice(request.getToppingPrice());
    }

    @Override
    public OrderDetailToppingResponse toResponse(OrderDetailTopping entity) {
        if (entity == null) {
            return null;
        }
        OrderDetailToppingResponse response = new OrderDetailToppingResponse();
        response.setOrderDetailId(entity.getOrderDetailId());
        response.setIngredientId(entity.getIngredientId());
        response.setQuantity(entity.getQuantity());
        response.setToppingPrice(entity.getToppingPrice());
        return response;
    }
}
