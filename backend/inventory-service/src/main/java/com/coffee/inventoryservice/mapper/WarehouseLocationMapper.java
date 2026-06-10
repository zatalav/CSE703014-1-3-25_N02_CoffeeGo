package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.WarehouseLocation;
import com.coffee.inventoryservice.dto.request.WarehouseLocationRequest;
import com.coffee.inventoryservice.dto.response.WarehouseLocationResponse;
import org.springframework.stereotype.Component;

@Component
public class WarehouseLocationMapper implements DtoMapper<WarehouseLocation, WarehouseLocationRequest, WarehouseLocationResponse> {
    @Override
    public WarehouseLocation toEntity(WarehouseLocationRequest request) {
        WarehouseLocation entity = new WarehouseLocation();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(WarehouseLocation entity, WarehouseLocationRequest request) {
        if (request == null) {
            return;
        }
        entity.setBranchId(request.getBranchId());
        entity.setZone(request.getZone());
        entity.setShelf(request.getShelf());
        entity.setSlot(request.getSlot());
    }

    @Override
    public WarehouseLocationResponse toResponse(WarehouseLocation entity) {
        if (entity == null) {
            return null;
        }
        WarehouseLocationResponse response = new WarehouseLocationResponse();
        response.setLocationId(entity.getLocationId());
        response.setBranchId(entity.getBranchId());
        response.setZone(entity.getZone());
        response.setShelf(entity.getShelf());
        response.setSlot(entity.getSlot());
        return response;
    }
}
