package com.coffee.authservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.authservice.entity.Employee;
import com.coffee.authservice.dto.request.EmployeeRequest;
import com.coffee.authservice.dto.response.EmployeeResponse;
import org.springframework.stereotype.Component;

@Component
public class EmployeeMapper implements DtoMapper<Employee, EmployeeRequest, EmployeeResponse> {
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
        return response;
    }
}
