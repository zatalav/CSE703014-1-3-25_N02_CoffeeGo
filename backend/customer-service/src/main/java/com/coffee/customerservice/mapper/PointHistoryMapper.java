package com.coffee.customerservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.customerservice.entity.PointHistory;
import com.coffee.customerservice.dto.request.PointHistoryRequest;
import com.coffee.customerservice.dto.response.PointHistoryResponse;
import org.springframework.stereotype.Component;

@Component
public class PointHistoryMapper implements DtoMapper<PointHistory, PointHistoryRequest, PointHistoryResponse> {
    @Override
    public PointHistory toEntity(PointHistoryRequest request) {
        PointHistory entity = new PointHistory();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(PointHistory entity, PointHistoryRequest request) {
        if (request == null) {
            return;
        }
        entity.setCustomerId(request.getCustomerId());
        entity.setOrderId(request.getOrderId());
        entity.setPointType(request.getPointType());
        entity.setAction(request.getAction());
        entity.setAmount(request.getAmount());
        entity.setRemainingAmount(request.getRemainingAmount());
        entity.setEarnedMonth(request.getEarnedMonth());
        entity.setExpiredAt(request.getExpiredAt());
        entity.setStatus(request.getStatus());
        entity.setRefHistoryId(request.getRefHistoryId());
        entity.setNote(request.getNote());
        entity.setCreatedAt(request.getCreatedAt());
    }

    @Override
    public PointHistoryResponse toResponse(PointHistory entity) {
        if (entity == null) {
            return null;
        }
        PointHistoryResponse response = new PointHistoryResponse();
        response.setHistoryId(entity.getHistoryId());
        response.setCustomerId(entity.getCustomerId());
        response.setOrderId(entity.getOrderId());
        response.setPointType(entity.getPointType());
        response.setAction(entity.getAction());
        response.setAmount(entity.getAmount());
        response.setRemainingAmount(entity.getRemainingAmount());
        response.setEarnedMonth(entity.getEarnedMonth());
        response.setExpiredAt(entity.getExpiredAt());
        response.setStatus(entity.getStatus());
        response.setRefHistoryId(entity.getRefHistoryId());
        response.setNote(entity.getNote());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
