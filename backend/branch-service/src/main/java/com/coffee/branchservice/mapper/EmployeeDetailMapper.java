package com.coffee.branchservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.branchservice.entity.EmployeeDetail;
import com.coffee.branchservice.dto.request.EmployeeDetailRequest;
import com.coffee.branchservice.dto.response.EmployeeDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class EmployeeDetailMapper implements DtoMapper<EmployeeDetail, EmployeeDetailRequest, EmployeeDetailResponse> {
    @Override
    public EmployeeDetail toEntity(EmployeeDetailRequest request) {
        EmployeeDetail entity = new EmployeeDetail();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(EmployeeDetail entity, EmployeeDetailRequest request) {
        if (request == null) {
            return;
        }
        entity.setEmployeeId(request.getEmployeeId());
        entity.setEmail(request.getEmail());
        entity.setPhoneNumber(request.getPhoneNumber());
        entity.setPassword(request.getPassword());
        entity.setGender(request.getGender());
        entity.setImgUrl(request.getImgUrl());
        entity.setCreatedAt(request.getCreatedAt());
    }

    @Override
    public EmployeeDetailResponse toResponse(EmployeeDetail entity) {
        if (entity == null) {
            return null;
        }
        EmployeeDetailResponse response = new EmployeeDetailResponse();
        response.setEmployeeId(entity.getEmployeeId());
        response.setEmail(entity.getEmail());
        response.setPhoneNumber(entity.getPhoneNumber());
        response.setGender(entity.getGender());
        response.setImgUrl(entity.getImgUrl());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
