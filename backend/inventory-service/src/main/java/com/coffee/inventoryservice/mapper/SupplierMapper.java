package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.Supplier;
import com.coffee.inventoryservice.dto.request.SupplierRequest;
import com.coffee.inventoryservice.dto.response.SupplierResponse;
import org.springframework.stereotype.Component;

@Component
public class SupplierMapper implements DtoMapper<Supplier, SupplierRequest, SupplierResponse> {
    @Override
    public Supplier toEntity(SupplierRequest request) {
        Supplier entity = new Supplier();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Supplier entity, SupplierRequest request) {
        if (request == null) {
            return;
        }
        entity.setSupplierName(request.getSupplierName());
        entity.setAddress(request.getAddress());
        entity.setStatus(request.getStatus());
        entity.setDescription(request.getDescription());
        entity.setUrlImg(request.getUrlImg());
    }

    @Override
    public SupplierResponse toResponse(Supplier entity) {
        if (entity == null) {
            return null;
        }
        SupplierResponse response = new SupplierResponse();
        response.setSupplierId(entity.getSupplierId());
        response.setSupplierName(entity.getSupplierName());
        response.setAddress(entity.getAddress());
        response.setStatus(entity.getStatus());
        response.setDescription(entity.getDescription());
        response.setUrlImg(entity.getUrlImg());
        return response;
    }
}
