package com.coffee.userservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.userservice.entity.CustomerLoyalty;
import com.coffee.userservice.dto.request.CustomerLoyaltyRequest;
import com.coffee.userservice.dto.response.CustomerLoyaltyResponse;
import org.springframework.stereotype.Component;

@Component
public class CustomerLoyaltyMapper implements DtoMapper<CustomerLoyalty, CustomerLoyaltyRequest, CustomerLoyaltyResponse> {
    @Override
    public CustomerLoyalty toEntity(CustomerLoyaltyRequest request) {
        CustomerLoyalty entity = new CustomerLoyalty();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(CustomerLoyalty entity, CustomerLoyaltyRequest request) {
        if (request == null) {
            return;
        }
        entity.setCustomerId(request.getCustomerId());
        entity.setRankId(request.getRankId());
        entity.setExpPoint(request.getExpPoint());
        entity.setDripsPoint(request.getDripsPoint());
        entity.setTotalMoney(request.getTotalMoney());
        entity.setTotalOrders(request.getTotalOrders());
        entity.setUpdatedAt(request.getUpdatedAt());
    }

    @Override
    public CustomerLoyaltyResponse toResponse(CustomerLoyalty entity) {
        if (entity == null) {
            return null;
        }
        CustomerLoyaltyResponse response = new CustomerLoyaltyResponse();
        response.setCustomerId(entity.getCustomerId());
        response.setRankId(entity.getRankId());
        response.setExpPoint(entity.getExpPoint());
        response.setDripsPoint(entity.getDripsPoint());
        response.setTotalMoney(entity.getTotalMoney());
        response.setTotalOrders(entity.getTotalOrders());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }
}
