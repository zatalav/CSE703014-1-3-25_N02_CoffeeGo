package com.coffee.customerservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.customerservice.dto.request.CustomerRequest;
import com.coffee.customerservice.dto.response.CustomerResponse;

public interface CustomerAdminService extends CrudService<CustomerRequest, CustomerResponse, Long> {
}
