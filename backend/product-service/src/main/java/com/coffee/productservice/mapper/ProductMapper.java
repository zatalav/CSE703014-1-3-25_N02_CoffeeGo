package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.Product;
import com.coffee.productservice.dto.request.ProductRequest;
import com.coffee.productservice.dto.response.ProductResponse;
import java.time.LocalDateTime;
import java.util.Locale;
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
        if (request.getProductType() != null) {
            entity.setProductType(normalizeProductType(request.getProductType()));
        } else if (entity.getProductType() == null) {
            entity.setProductType("drink");
        }
        entity.setImgUrl(request.getImgUrl());
        entity.setStatus(request.getStatus() != null ? request.getStatus() : "active");
        if (entity.getProductId() == null) {
            entity.setCreatedAt(request.getCreatedAt() != null ? request.getCreatedAt() : LocalDateTime.now());
        } else if (request.getCreatedAt() != null) {
            entity.setCreatedAt(request.getCreatedAt());
        }
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
        response.setProductType(entity.getProductType() != null ? entity.getProductType() : "drink");
        response.setImgUrl(entity.getImgUrl());
        response.setStatus(entity.getStatus());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }

    private String normalizeProductType(String productType) {
        String normalized = productType == null ? "" : productType.trim().toLowerCase(Locale.ROOT);
        if ("cake".equals(normalized) || "bakery".equals(normalized) || "pastry".equals(normalized) || "snack".equals(normalized)) {
            return "cake";
        }
        if ("drink".equals(normalized) || "beverage".equals(normalized) || "coffee".equals(normalized) || "tea".equals(normalized)) {
            return "drink";
        }
        if ("seasonal".equals(normalized) || "regular".equals(normalized)) {
            return normalized;
        }
        return "drink";
    }
}
