package com.coffee.customerservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.customerservice.entity.DripsExchangeHistory;
import com.coffee.customerservice.dto.request.DripsExchangeHistoryRequest;
import com.coffee.customerservice.dto.response.DripsExchangeHistoryResponse;
import org.springframework.stereotype.Component;

@Component
public class DripsExchangeHistoryMapper implements DtoMapper<DripsExchangeHistory, DripsExchangeHistoryRequest, DripsExchangeHistoryResponse> {
    @Override
    public DripsExchangeHistory toEntity(DripsExchangeHistoryRequest request) {
        DripsExchangeHistory entity = new DripsExchangeHistory();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(DripsExchangeHistory entity, DripsExchangeHistoryRequest request) {
        if (request == null) {
            return;
        }
        entity.setVoucherId(request.getVoucherId());
        entity.setCustomerId(request.getCustomerId());
        entity.setCouponId(request.getCouponId());
        entity.setDripsSpent(request.getDripsSpent());
        entity.setExchangedAt(request.getExchangedAt());
    }

    @Override
    public DripsExchangeHistoryResponse toResponse(DripsExchangeHistory entity) {
        if (entity == null) {
            return null;
        }
        DripsExchangeHistoryResponse response = new DripsExchangeHistoryResponse();
        response.setExchangeId(entity.getExchangeId());
        response.setVoucherId(entity.getVoucherId());
        response.setCustomerId(entity.getCustomerId());
        response.setCouponId(entity.getCouponId());
        response.setDripsSpent(entity.getDripsSpent());
        response.setExchangedAt(entity.getExchangedAt());
        return response;
    }
}
