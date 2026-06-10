package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.ProductVariant;
import com.coffee.productservice.dto.request.ProductVariantRequest;
import com.coffee.productservice.dto.response.ProductVariantResponse;
import org.springframework.stereotype.Component;

@Component
public class ProductVariantMapper implements DtoMapper<ProductVariant, ProductVariantRequest, ProductVariantResponse> {
    @Override
    public ProductVariant toEntity(ProductVariantRequest request) {
        ProductVariant entity = new ProductVariant();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(ProductVariant entity, ProductVariantRequest request) {
        if (request == null) {
            return;
        }
        entity.setProductId(request.getProductId());
        entity.setVariantId(request.getVariantId());
        entity.setIsDefault(request.getIsDefault());
    }

    @Override
    public ProductVariantResponse toResponse(ProductVariant entity) {
        if (entity == null) {
            return null;
        }
        ProductVariantResponse response = new ProductVariantResponse();
        response.setProductId(entity.getProductId());
        response.setVariantId(entity.getVariantId());
        response.setIsDefault(entity.getIsDefault());
        return response;
    }
}
