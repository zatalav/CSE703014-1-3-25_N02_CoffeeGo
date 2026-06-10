package com.coffee.promotionservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.promotionservice.entity.Product;
import com.coffee.promotionservice.dto.request.ProductRequest;
import com.coffee.promotionservice.dto.response.ProductResponse;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper implements DtoMapper<Product, ProductRequest, ProductResponse> {
    @Override
    public Product toEntity(ProductRequest request) {
        Product entity = new Product();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Product entity, ProductRequest request) {
        if (request == null) {
            return;
        }
        entity.setPCategoryId(request.getPCategoryId());
        entity.setProductName(request.getProductName());
        entity.setDescription(request.getDescription());
        entity.setBasePrice(request.getBasePrice());
        entity.setImgUrl(request.getImgUrl());
        entity.setStatus(request.getStatus());
        entity.setCreatedAt(request.getCreatedAt());
    }

    @Override
    public ProductResponse toResponse(Product entity) {
        if (entity == null) {
            return null;
        }
        ProductResponse response = new ProductResponse();
        response.setProductId(entity.getProductId());
        response.setPCategoryId(entity.getPCategoryId());
        response.setProductName(entity.getProductName());
        response.setDescription(entity.getDescription());
        response.setBasePrice(entity.getBasePrice());
        response.setImgUrl(entity.getImgUrl());
        response.setStatus(entity.getStatus());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
