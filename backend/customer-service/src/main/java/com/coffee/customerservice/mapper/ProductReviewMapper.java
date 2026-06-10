package com.coffee.customerservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.customerservice.entity.ProductReview;
import com.coffee.customerservice.dto.request.ProductReviewRequest;
import com.coffee.customerservice.dto.response.ProductReviewResponse;
import org.springframework.stereotype.Component;

@Component
public class ProductReviewMapper implements DtoMapper<ProductReview, ProductReviewRequest, ProductReviewResponse> {
    @Override
    public ProductReview toEntity(ProductReviewRequest request) {
        ProductReview entity = new ProductReview();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(ProductReview entity, ProductReviewRequest request) {
        if (request == null) {
            return;
        }
        entity.setProductId(request.getProductId());
        entity.setCustomerId(request.getCustomerId());
        entity.setOrderId(request.getOrderId());
        entity.setRating(request.getRating());
        entity.setCreatedAt(request.getCreatedAt());
    }

    @Override
    public ProductReviewResponse toResponse(ProductReview entity) {
        if (entity == null) {
            return null;
        }
        ProductReviewResponse response = new ProductReviewResponse();
        response.setReviewId(entity.getReviewId());
        response.setProductId(entity.getProductId());
        response.setCustomerId(entity.getCustomerId());
        response.setOrderId(entity.getOrderId());
        response.setRating(entity.getRating());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
