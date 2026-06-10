package com.coffee.productservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.productservice.dto.request.SeasonRequest;
import com.coffee.productservice.dto.response.SeasonResponse;

public interface SeasonAdminService extends CrudService<SeasonRequest, SeasonResponse, Long> {
}
