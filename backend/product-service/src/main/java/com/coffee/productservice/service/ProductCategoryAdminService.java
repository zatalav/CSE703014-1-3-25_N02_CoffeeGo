package com.coffee.productservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.productservice.dto.request.ProductCategoryRequest;
import com.coffee.productservice.dto.response.ProductCategoryResponse;

public interface ProductCategoryAdminService extends CrudService<ProductCategoryRequest, ProductCategoryResponse, Long> {
}
