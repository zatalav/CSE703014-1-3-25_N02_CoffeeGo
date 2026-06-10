package com.coffee.inventoryservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.inventoryservice.dto.request.StockExportRequest;
import com.coffee.inventoryservice.dto.response.StockExportResponse;

public interface StockExportAdminService extends CrudService<StockExportRequest, StockExportResponse, Long> {
}
