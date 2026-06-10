package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.StockImportDetail;
import com.coffee.inventoryservice.dto.request.StockImportDetailRequest;
import com.coffee.inventoryservice.dto.response.StockImportDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class StockImportDetailMapper implements DtoMapper<StockImportDetail, StockImportDetailRequest, StockImportDetailResponse> {
    @Override
    public StockImportDetail toEntity(StockImportDetailRequest request) {
        StockImportDetail entity = new StockImportDetail();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(StockImportDetail entity, StockImportDetailRequest request) {
        if (request == null) {
            return;
        }
        entity.setImportId(request.getImportId());
        entity.setIngredientId(request.getIngredientId());
        entity.setQuantity(request.getQuantity());
        entity.setUnit(request.getUnit());
        entity.setUnitPrice(request.getUnitPrice());
        entity.setExpiryDate(request.getExpiryDate());
    }

    @Override
    public StockImportDetailResponse toResponse(StockImportDetail entity) {
        if (entity == null) {
            return null;
        }
        StockImportDetailResponse response = new StockImportDetailResponse();
        response.setImportDetailId(entity.getImportDetailId());
        response.setImportId(entity.getImportId());
        response.setIngredientId(entity.getIngredientId());
        response.setQuantity(entity.getQuantity());
        response.setUnit(entity.getUnit());
        response.setUnitPrice(entity.getUnitPrice());
        response.setExpiryDate(entity.getExpiryDate());
        return response;
    }
}
