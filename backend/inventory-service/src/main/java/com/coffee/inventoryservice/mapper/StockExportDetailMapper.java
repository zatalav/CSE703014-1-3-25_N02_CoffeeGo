package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.StockExportDetail;
import com.coffee.inventoryservice.dto.request.StockExportDetailRequest;
import com.coffee.inventoryservice.dto.response.StockExportDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class StockExportDetailMapper implements DtoMapper<StockExportDetail, StockExportDetailRequest, StockExportDetailResponse> {
    @Override
    public StockExportDetail toEntity(StockExportDetailRequest request) {
        StockExportDetail entity = new StockExportDetail();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(StockExportDetail entity, StockExportDetailRequest request) {
        if (request == null) {
            return;
        }
        entity.setExportId(request.getExportId());
        entity.setIngredientId(request.getIngredientId());
        entity.setQuantity(request.getQuantity());
        entity.setUnit(request.getUnit());
        entity.setUnitPrice(request.getUnitPrice());
    }

    @Override
    public StockExportDetailResponse toResponse(StockExportDetail entity) {
        if (entity == null) {
            return null;
        }
        StockExportDetailResponse response = new StockExportDetailResponse();
        response.setExportDetailId(entity.getExportDetailId());
        response.setExportId(entity.getExportId());
        response.setIngredientId(entity.getIngredientId());
        response.setQuantity(entity.getQuantity());
        response.setUnit(entity.getUnit());
        response.setUnitPrice(entity.getUnitPrice());
        return response;
    }
}
