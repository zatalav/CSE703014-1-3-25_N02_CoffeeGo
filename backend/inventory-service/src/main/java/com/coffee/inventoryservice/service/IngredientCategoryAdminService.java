package com.coffee.inventoryservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.inventoryservice.dto.request.IngredientCategoryRequest;
import com.coffee.inventoryservice.dto.response.IngredientCategoryResponse;

public interface IngredientCategoryAdminService extends CrudService<IngredientCategoryRequest, IngredientCategoryResponse, Long> {
}
