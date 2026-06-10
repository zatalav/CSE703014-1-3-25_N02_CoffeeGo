package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.StockImport;
import com.coffee.inventoryservice.dto.request.StockImportRequest;
import com.coffee.inventoryservice.dto.response.StockImportResponse;
import org.springframework.stereotype.Component;

@Component
public class StockImportMapper implements DtoMapper<StockImport, StockImportRequest, StockImportResponse> {
    @Override
    public StockImport toEntity(StockImportRequest request) {
        StockImport entity = new StockImport();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(StockImport entity, StockImportRequest request) {
        if (request == null) {
            return;
        }
        entity.setBranchId(request.getBranchId());
        entity.setSupplierId(request.getSupplierId());
        entity.setEmployeeId(request.getEmployeeId());
        entity.setTotalAmount(request.getTotalAmount());
        entity.setNote(request.getNote());
        entity.setImportedAt(request.getImportedAt());
    }

    @Override
    public StockImportResponse toResponse(StockImport entity) {
        if (entity == null) {
            return null;
        }
        StockImportResponse response = new StockImportResponse();
        response.setImportId(entity.getImportId());
        response.setBranchId(entity.getBranchId());
        response.setSupplierId(entity.getSupplierId());
        response.setEmployeeId(entity.getEmployeeId());
        response.setTotalAmount(entity.getTotalAmount());
        response.setNote(entity.getNote());
        response.setImportedAt(entity.getImportedAt());
        return response;
    }
}
