package com.coffee.inventoryservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.inventoryservice.dto.request.WarehouseLocationRequest;
import com.coffee.inventoryservice.dto.response.WarehouseLocationResponse;

public interface WarehouseLocationAdminService extends CrudService<WarehouseLocationRequest, WarehouseLocationResponse, Long> {
}
