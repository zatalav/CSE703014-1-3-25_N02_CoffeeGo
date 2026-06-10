package com.coffee.customerservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.customerservice.dto.request.ProductReviewRequest;
import com.coffee.customerservice.dto.response.ProductReviewResponse;

public interface ProductReviewAdminService extends CrudService<ProductReviewRequest, ProductReviewResponse, Long> {
}
