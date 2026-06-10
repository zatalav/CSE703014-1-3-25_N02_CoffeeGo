package com.coffee.productservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.productservice.dto.request.VariantRequest;
import com.coffee.productservice.dto.response.VariantResponse;

public interface VariantAdminService extends CrudService<VariantRequest, VariantResponse, Long> {
}
