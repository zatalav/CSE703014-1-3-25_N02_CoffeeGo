package com.coffee.promotionservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.promotionservice.entity.Coupon;
import com.coffee.promotionservice.mapper.CouponMapper;
import com.coffee.promotionservice.repository.CouponRepository;
import com.coffee.promotionservice.dto.request.CouponRequest;
import com.coffee.promotionservice.dto.response.CouponResponse;
import com.coffee.promotionservice.service.CouponAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CouponAdminServiceImpl extends CrudServiceSupport<Coupon, Long, CouponRequest, CouponResponse> implements CouponAdminService {
    public CouponAdminServiceImpl(CouponRepository repository, CouponMapper mapper) {
        super(repository, repository, mapper, Coupon.class, "coupon_id", List.of("code", "description"), Map.of("status", "status", "applyFor", "applyFor", "discountType", "discountType"), "startDate");
    }
}
