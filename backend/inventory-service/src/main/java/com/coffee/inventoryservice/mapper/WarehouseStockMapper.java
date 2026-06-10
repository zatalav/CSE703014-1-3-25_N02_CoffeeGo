package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.WarehouseStock;
import com.coffee.inventoryservice.dto.request.WarehouseStockRequest;
import com.coffee.inventoryservice.dto.response.WarehouseStockResponse;
import org.springframework.stereotype.Component;

@Component
public class WarehouseStockMapper implements DtoMapper<WarehouseStock, WarehouseStockRequest, WarehouseStockResponse> {
    @Override
    public WarehouseStock toEntity(WarehouseStockRequest request) {
        WarehouseStock entity = new WarehouseStock();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(WarehouseStock entity, WarehouseStockRequest request) {
        if (request == null) {
            return;
        }
        entity.setIngredientId(request.getIngredientId());
        entity.setLocationId(request.getLocationId());
        entity.setBranchId(request.getBranchId());
        entity.setQuantity(request.getQuantity());
        entity.setMinQuantity(request.getMinQuantity());
        entity.setUnit(request.getUnit());
    }

    @Override
    public WarehouseStockResponse toResponse(WarehouseStock entity) {
        if (entity == null) {
            return null;
        }
        WarehouseStockResponse response = new WarehouseStockResponse();
        response.setStockId(entity.getStockId());
        response.setIngredientId(entity.getIngredientId());
        response.setLocationId(entity.getLocationId());
        response.setBranchId(entity.getBranchId());
        response.setQuantity(entity.getQuantity());
        response.setMinQuantity(entity.getMinQuantity());
        response.setUnit(entity.getUnit());
        return response;
    }
}
