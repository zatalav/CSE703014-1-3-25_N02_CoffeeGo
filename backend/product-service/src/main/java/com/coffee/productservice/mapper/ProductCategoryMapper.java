package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.ProductCategory;
import com.coffee.productservice.dto.request.ProductCategoryRequest;
import com.coffee.productservice.dto.response.ProductCategoryResponse;
import org.springframework.stereotype.Component;

@Component
public class ProductCategoryMapper implements DtoMapper<ProductCategory, ProductCategoryRequest, ProductCategoryResponse> {
    @Override
    public ProductCategory toEntity(ProductCategoryRequest request) {
        ProductCategory entity = new ProductCategory();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(ProductCategory entity, ProductCategoryRequest request) {
        if (request == null) {
            return;
        }
        entity.setPCategoryName(request.getPCategoryName());
    }

    @Override
    public ProductCategoryResponse toResponse(ProductCategory entity) {
        if (entity == null) {
            return null;
        }
        ProductCategoryResponse response = new ProductCategoryResponse();
        response.setPCategoryId(entity.getPCategoryId());
        response.setPCategoryName(entity.getPCategoryName());
        return response;
    }
}
