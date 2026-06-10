package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.Combo;
import com.coffee.productservice.dto.request.ComboRequest;
import com.coffee.productservice.dto.response.ComboResponse;
import org.springframework.stereotype.Component;

@Component
public class ComboMapper implements DtoMapper<Combo, ComboRequest, ComboResponse> {
    @Override
    public Combo toEntity(ComboRequest request) {
        Combo entity = new Combo();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Combo entity, ComboRequest request) {
        if (request == null) {
            return;
        }
        entity.setComboName(request.getComboName());
        entity.setDescription(request.getDescription());
        entity.setCategory(request.getCategory());
        entity.setImgUrl(request.getImgUrl());
        entity.setPrice(request.getPrice());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setStatus(request.getStatus());
    }

    @Override
    public ComboResponse toResponse(Combo entity) {
        if (entity == null) {
            return null;
        }
        ComboResponse response = new ComboResponse();
        response.setComboId(entity.getComboId());
        response.setComboName(entity.getComboName());
        response.setDescription(entity.getDescription());
        response.setCategory(entity.getCategory());
        response.setImgUrl(entity.getImgUrl());
        response.setPrice(entity.getPrice());
        response.setStartDate(entity.getStartDate());
        response.setEndDate(entity.getEndDate());
        response.setStatus(entity.getStatus());
        return response;
    }
}
