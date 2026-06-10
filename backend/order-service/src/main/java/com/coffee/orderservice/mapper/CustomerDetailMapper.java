package com.coffee.orderservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.orderservice.entity.CustomerDetail;
import com.coffee.orderservice.dto.request.CustomerDetailRequest;
import com.coffee.orderservice.dto.response.CustomerDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class CustomerDetailMapper implements DtoMapper<CustomerDetail, CustomerDetailRequest, CustomerDetailResponse> {
    @Override
    public CustomerDetail toEntity(CustomerDetailRequest request) {
        CustomerDetail entity = new CustomerDetail();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(CustomerDetail entity, CustomerDetailRequest request) {
        if (request == null) {
            return;
        }
        entity.setCustomerId(request.getCustomerId());
        entity.setEmail(request.getEmail());
        entity.setPhoneNumber(request.getPhoneNumber());
        entity.setPassword(request.getPassword());
        entity.setAddress(request.getAddress());
        entity.setUpdatedAt(request.getUpdatedAt());
    }

    @Override
    public CustomerDetailResponse toResponse(CustomerDetail entity) {
        if (entity == null) {
            return null;
        }
        CustomerDetailResponse response = new CustomerDetailResponse();
        response.setCustomerId(entity.getCustomerId());
        response.setEmail(entity.getEmail());
        response.setPhoneNumber(entity.getPhoneNumber());
        response.setAddress(entity.getAddress());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }
}
