package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.Variant;
import com.coffee.productservice.dto.request.VariantRequest;
import com.coffee.productservice.dto.response.VariantResponse;
import org.springframework.stereotype.Component;

@Component
public class VariantMapper implements DtoMapper<Variant, VariantRequest, VariantResponse> {
    @Override
    public Variant toEntity(VariantRequest request) {
        Variant entity = new Variant();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Variant entity, VariantRequest request) {
        if (request == null) {
            return;
        }
        entity.setVariantGroup(request.getVariantGroup());
        entity.setVariantLabel(request.getVariantLabel());
        entity.setExtraPrice(request.getExtraPrice());
        entity.setStatus(request.getStatus());
    }

    @Override
    public VariantResponse toResponse(Variant entity) {
        if (entity == null) {
            return null;
        }
        VariantResponse response = new VariantResponse();
        response.setVariantId(entity.getVariantId());
        response.setVariantGroup(entity.getVariantGroup());
        response.setVariantLabel(entity.getVariantLabel());
        response.setExtraPrice(entity.getExtraPrice());
        response.setStatus(entity.getStatus());
        return response;
    }
}
