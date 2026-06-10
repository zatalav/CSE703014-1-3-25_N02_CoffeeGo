package com.coffee.contentservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.contentservice.dto.request.BannerRequest;
import com.coffee.contentservice.dto.response.BannerResponse;

public interface BannerAdminService extends CrudService<BannerRequest, BannerResponse, Long> {
}
