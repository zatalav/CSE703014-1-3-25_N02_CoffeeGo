package com.coffee.authservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.authservice.entity.Role;
import com.coffee.authservice.dto.request.RoleRequest;
import com.coffee.authservice.dto.response.RoleResponse;
import org.springframework.stereotype.Component;

@Component
public class RoleMapper implements DtoMapper<Role, RoleRequest, RoleResponse> {
    @Override
    public Role toEntity(RoleRequest request) {
        Role entity = new Role();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Role entity, RoleRequest request) {
        if (request == null) {
            return;
        }
        entity.setRoleName(request.getRoleName());
        entity.setRoleGroup(request.getRoleGroup());
        entity.setDepartment(request.getDepartment());
        entity.setStatus(request.getStatus());
    }

    @Override
    public RoleResponse toResponse(Role entity) {
        if (entity == null) {
            return null;
        }
        RoleResponse response = new RoleResponse();
        response.setRoleId(entity.getRoleId());
        response.setRoleName(entity.getRoleName());
        response.setRoleGroup(entity.getRoleGroup());
        response.setDepartment(entity.getDepartment());
        response.setStatus(entity.getStatus());
        return response;
    }
}
