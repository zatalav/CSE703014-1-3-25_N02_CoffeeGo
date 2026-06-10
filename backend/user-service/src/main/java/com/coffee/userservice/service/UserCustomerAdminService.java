package com.coffee.userservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.userservice.dto.request.CustomerRequest;
import com.coffee.userservice.dto.response.CustomerResponse;

public interface UserCustomerAdminService extends CrudService<CustomerRequest, CustomerResponse, Long> {
}
