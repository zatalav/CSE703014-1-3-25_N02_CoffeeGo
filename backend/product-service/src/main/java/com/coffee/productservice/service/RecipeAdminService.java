package com.coffee.productservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.productservice.dto.request.RecipeRequest;
import com.coffee.productservice.dto.response.RecipeResponse;

public interface RecipeAdminService extends CrudService<RecipeRequest, RecipeResponse, Long> {
}
