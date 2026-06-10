package com.coffee.inventoryservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.inventoryservice.dto.request.SupplierRequest;
import com.coffee.inventoryservice.dto.response.SupplierResponse;

public interface SupplierAdminService extends CrudService<SupplierRequest, SupplierResponse, Long> {
}
