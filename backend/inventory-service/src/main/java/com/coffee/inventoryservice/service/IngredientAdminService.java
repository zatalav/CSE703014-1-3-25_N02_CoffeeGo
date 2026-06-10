package com.coffee.inventoryservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.inventoryservice.dto.request.IngredientRequest;
import com.coffee.inventoryservice.dto.response.IngredientResponse;

public interface IngredientAdminService extends CrudService<IngredientRequest, IngredientResponse, Long> {
}
