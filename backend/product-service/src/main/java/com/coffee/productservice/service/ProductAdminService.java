package com.coffee.productservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.productservice.dto.request.ProductRequest;
import com.coffee.productservice.dto.response.ProductResponse;

public interface ProductAdminService extends CrudService<ProductRequest, ProductResponse, Long> {
}
