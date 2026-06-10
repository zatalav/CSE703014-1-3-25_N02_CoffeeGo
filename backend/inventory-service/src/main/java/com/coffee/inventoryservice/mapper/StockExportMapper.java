package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.StockExport;
import com.coffee.inventoryservice.dto.request.StockExportRequest;
import com.coffee.inventoryservice.dto.response.StockExportResponse;
import org.springframework.stereotype.Component;

@Component
public class StockExportMapper implements DtoMapper<StockExport, StockExportRequest, StockExportResponse> {
    @Override
    public StockExport toEntity(StockExportRequest request) {
        StockExport entity = new StockExport();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(StockExport entity, StockExportRequest request) {
        if (request == null) {
            return;
        }
        entity.setFromBranchId(request.getFromBranchId());
        entity.setToBranchId(request.getToBranchId());
        entity.setEmployeeId(request.getEmployeeId());
        entity.setNote(request.getNote());
        entity.setTotalAmount(request.getTotalAmount());
        entity.setExportedAt(request.getExportedAt());
    }

    @Override
    public StockExportResponse toResponse(StockExport entity) {
        if (entity == null) {
            return null;
        }
        StockExportResponse response = new StockExportResponse();
        response.setExportId(entity.getExportId());
        response.setFromBranchId(entity.getFromBranchId());
        response.setToBranchId(entity.getToBranchId());
        response.setEmployeeId(entity.getEmployeeId());
        response.setNote(entity.getNote());
        response.setTotalAmount(entity.getTotalAmount());
        response.setExportedAt(entity.getExportedAt());
        return response;
    }
}
