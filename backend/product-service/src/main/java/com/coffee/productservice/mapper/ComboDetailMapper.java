package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.ComboDetail;
import com.coffee.productservice.dto.request.ComboDetailRequest;
import com.coffee.productservice.dto.response.ComboDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class ComboDetailMapper implements DtoMapper<ComboDetail, ComboDetailRequest, ComboDetailResponse> {
    @Override
    public ComboDetail toEntity(ComboDetailRequest request) {
        ComboDetail entity = new ComboDetail();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(ComboDetail entity, ComboDetailRequest request) {
        if (request == null) {
            return;
        }
        entity.setComboId(request.getComboId());
        entity.setProductId(request.getProductId());
        entity.setQuantity(request.getQuantity());
    }

    @Override
    public ComboDetailResponse toResponse(ComboDetail entity) {
        if (entity == null) {
            return null;
        }
        ComboDetailResponse response = new ComboDetailResponse();
        response.setComboId(entity.getComboId());
        response.setProductId(entity.getProductId());
        response.setQuantity(entity.getQuantity());
        return response;
    }
}
