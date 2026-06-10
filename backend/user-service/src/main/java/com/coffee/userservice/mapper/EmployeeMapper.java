package com.coffee.userservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.userservice.entity.Employee;
import com.coffee.userservice.entity.EmployeeDetail;
import com.coffee.userservice.dto.request.EmployeeRequest;
import com.coffee.userservice.dto.response.EmployeeResponse;
import com.coffee.userservice.repository.EmployeeDetailRepository;
import org.springframework.stereotype.Component;

@Component
public class EmployeeMapper implements DtoMapper<Employee, EmployeeRequest, EmployeeResponse> {
    private final EmployeeDetailRepository detailRepository;

    public EmployeeMapper(EmployeeDetailRepository detailRepository) {
        this.detailRepository = detailRepository;
    }

    @Override
    public Employee toEntity(EmployeeRequest request) {
        Employee entity = new Employee();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Employee entity, EmployeeRequest request) {
        if (request == null) {
            return;
        }
        entity.setRoleId(request.getRoleId());
        entity.setBranchId(request.getBranchId());
        entity.setName(request.getName());
        entity.setStatus(request.getStatus());
    }

    @Override
    public EmployeeResponse toResponse(Employee entity) {
        if (entity == null) {
            return null;
        }
        EmployeeResponse response = new EmployeeResponse();
        response.setId(entity.getId());
        response.setRoleId(entity.getRoleId());
        response.setBranchId(entity.getBranchId());
        response.setName(entity.getName());
        response.setStatus(entity.getStatus());
        detailRepository.findById(entity.getId()).ifPresent(detail -> applyDetail(response, detail));
        return response;
    }

    private void applyDetail(EmployeeResponse response, EmployeeDetail detail) {
        response.setEmail(detail.getEmail());
        response.setPhoneNumber(detail.getPhoneNumber());
        response.setImgUrl(detail.getImgUrl());
        response.setCreatedAt(detail.getCreatedAt());
    }
}
