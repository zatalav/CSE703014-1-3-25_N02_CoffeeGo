package com.coffee.orderservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.orderservice.dto.request.OrderEntityRequest;
import com.coffee.orderservice.dto.response.OrderEntityResponse;

public interface OrderAdminService extends CrudService<OrderEntityRequest, OrderEntityResponse, Long> {
}
