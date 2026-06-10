package com.coffee.userservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.userservice.dto.request.EmployeeRequest;
import com.coffee.userservice.dto.response.EmployeeResponse;

public interface EmployeeAdminService extends CrudService<EmployeeRequest, EmployeeResponse, Long> {
}
