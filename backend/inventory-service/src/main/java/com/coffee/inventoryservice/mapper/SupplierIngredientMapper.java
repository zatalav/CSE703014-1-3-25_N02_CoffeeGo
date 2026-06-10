package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.SupplierIngredient;
import com.coffee.inventoryservice.dto.request.SupplierIngredientRequest;
import com.coffee.inventoryservice.dto.response.SupplierIngredientResponse;
import org.springframework.stereotype.Component;

@Component
public class SupplierIngredientMapper implements DtoMapper<SupplierIngredient, SupplierIngredientRequest, SupplierIngredientResponse> {
    @Override
    public SupplierIngredient toEntity(SupplierIngredientRequest request) {
        SupplierIngredient entity = new SupplierIngredient();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(SupplierIngredient entity, SupplierIngredientRequest request) {
        if (request == null) {
            return;
        }
        entity.setSupplierId(request.getSupplierId());
        entity.setIngredientId(request.getIngredientId());
        entity.setMinimumStock(request.getMinimumStock());
        entity.setUnit(request.getUnit());
        entity.setPrice(request.getPrice());
    }

    @Override
    public SupplierIngredientResponse toResponse(SupplierIngredient entity) {
        if (entity == null) {
            return null;
        }
        SupplierIngredientResponse response = new SupplierIngredientResponse();
        response.setSupplierId(entity.getSupplierId());
        response.setIngredientId(entity.getIngredientId());
        response.setMinimumStock(entity.getMinimumStock());
        response.setUnit(entity.getUnit());
        response.setPrice(entity.getPrice());
        return response;
    }
}
