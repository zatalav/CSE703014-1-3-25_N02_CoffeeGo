package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.ProductSize;
import com.coffee.productservice.dto.request.ProductSizeRequest;
import com.coffee.productservice.dto.response.ProductSizeResponse;
import org.springframework.stereotype.Component;

@Component
public class ProductSizeMapper implements DtoMapper<ProductSize, ProductSizeRequest, ProductSizeResponse> {
    @Override
    public ProductSize toEntity(ProductSizeRequest request) {
        ProductSize entity = new ProductSize();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(ProductSize entity, ProductSizeRequest request) {
        if (request == null) {
            return;
        }
        entity.setProductId(request.getProductId());
        entity.setSize(request.getSize());
        entity.setExtraPrice(request.getExtraPrice());
        entity.setStatus(request.getStatus());
    }

    @Override
    public ProductSizeResponse toResponse(ProductSize entity) {
        if (entity == null) {
            return null;
        }
        ProductSizeResponse response = new ProductSizeResponse();
        response.setSizeId(entity.getSizeId());
        response.setProductId(entity.getProductId());
        response.setSize(entity.getSize());
        response.setExtraPrice(entity.getExtraPrice());
        response.setStatus(entity.getStatus());
        return response;
    }
}
