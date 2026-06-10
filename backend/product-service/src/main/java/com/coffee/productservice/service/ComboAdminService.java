package com.coffee.productservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.productservice.dto.request.ComboRequest;
import com.coffee.productservice.dto.response.ComboResponse;

public interface ComboAdminService extends CrudService<ComboRequest, ComboResponse, Long> {
}
