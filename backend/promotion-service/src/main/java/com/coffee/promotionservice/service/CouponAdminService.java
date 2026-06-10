package com.coffee.promotionservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.promotionservice.dto.request.CouponRequest;
import com.coffee.promotionservice.dto.response.CouponResponse;

public interface CouponAdminService extends CrudService<CouponRequest, CouponResponse, Long> {
}
