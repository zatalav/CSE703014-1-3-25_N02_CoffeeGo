package com.coffee.productservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.productservice.dto.request.IngredientRequest;
import com.coffee.productservice.dto.response.IngredientResponse;

public interface ToppingAdminService extends CrudService<IngredientRequest, IngredientResponse, Long> {
}
