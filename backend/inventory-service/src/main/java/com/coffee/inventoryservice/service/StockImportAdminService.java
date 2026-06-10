package com.coffee.inventoryservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.inventoryservice.dto.request.StockImportRequest;
import com.coffee.inventoryservice.dto.response.StockImportResponse;

public interface StockImportAdminService extends CrudService<StockImportRequest, StockImportResponse, Long> {
}
