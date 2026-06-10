package com.coffee.userservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.userservice.entity.Role;
import com.coffee.userservice.mapper.RoleMapper;
import com.coffee.userservice.repository.RoleRepository;
import com.coffee.userservice.dto.request.RoleRequest;
import com.coffee.userservice.dto.response.RoleResponse;
import com.coffee.userservice.service.RoleAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class RoleAdminServiceImpl extends CrudServiceSupport<Role, Long, RoleRequest, RoleResponse> implements RoleAdminService {
    public RoleAdminServiceImpl(RoleRepository repository, RoleMapper mapper) {
        super(repository, repository, mapper, Role.class, "role_id", List.of("roleName"), Map.of("status", "status", "roleId", "roleId"), null);
    }
}
