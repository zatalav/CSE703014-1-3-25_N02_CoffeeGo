package com.coffee.customerservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.customerservice.entity.ProductReview;
import com.coffee.customerservice.mapper.ProductReviewMapper;
import com.coffee.customerservice.repository.ProductReviewRepository;
import com.coffee.customerservice.dto.request.ProductReviewRequest;
import com.coffee.customerservice.dto.response.ProductReviewResponse;
import com.coffee.customerservice.service.ProductReviewAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ProductReviewAdminServiceImpl extends CrudServiceSupport<ProductReview, Long, ProductReviewRequest, ProductReviewResponse> implements ProductReviewAdminService {
    public ProductReviewAdminServiceImpl(ProductReviewRepository repository, ProductReviewMapper mapper) {
        super(repository, repository, mapper, ProductReview.class, "review_id", List.of(), Map.of("productId", "productId", "customerId", "customerId"), "createdAt");
    }
}
