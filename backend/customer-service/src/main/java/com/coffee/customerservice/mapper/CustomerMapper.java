package com.coffee.customerservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.customerservice.entity.Customer;
import com.coffee.customerservice.dto.request.CustomerRequest;
import com.coffee.customerservice.dto.response.CustomerResponse;
import org.springframework.stereotype.Component;

@Component
public class CustomerMapper implements DtoMapper<Customer, CustomerRequest, CustomerResponse> {
    @Override
    public Customer toEntity(CustomerRequest request) {
        Customer entity = new Customer();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Customer entity, CustomerRequest request) {
        if (request == null) {
            return;
        }
        entity.setName(request.getName());
        entity.setGender(request.getGender());
        entity.setDateOfBirth(request.getDateOfBirth());
        entity.setStatus(request.getStatus());
        entity.setCreatedAt(request.getCreatedAt());
    }

    @Override
    public CustomerResponse toResponse(Customer entity) {
        if (entity == null) {
            return null;
        }
        CustomerResponse response = new CustomerResponse();
        response.setId(entity.getId());
        response.setName(entity.getName());
        response.setGender(entity.getGender());
        response.setDateOfBirth(entity.getDateOfBirth());
        response.setStatus(entity.getStatus());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
