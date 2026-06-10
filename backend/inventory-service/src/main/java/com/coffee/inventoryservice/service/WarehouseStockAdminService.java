package com.coffee.inventoryservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.inventoryservice.dto.request.WarehouseStockRequest;
import com.coffee.inventoryservice.dto.response.WarehouseStockResponse;

public interface WarehouseStockAdminService extends CrudService<WarehouseStockRequest, WarehouseStockResponse, Long> {
}
