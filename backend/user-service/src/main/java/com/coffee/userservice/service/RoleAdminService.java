package com.coffee.userservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.userservice.dto.request.RoleRequest;
import com.coffee.userservice.dto.response.RoleResponse;

public interface RoleAdminService extends CrudService<RoleRequest, RoleResponse, Long> {
}
