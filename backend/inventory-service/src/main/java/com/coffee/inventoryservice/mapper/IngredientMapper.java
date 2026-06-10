package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.Ingredient;
import com.coffee.inventoryservice.dto.request.IngredientRequest;
import com.coffee.inventoryservice.dto.response.IngredientResponse;
import org.springframework.stereotype.Component;

@Component
public class IngredientMapper implements DtoMapper<Ingredient, IngredientRequest, IngredientResponse> {
    @Override
    public Ingredient toEntity(IngredientRequest request) {
        Ingredient entity = new Ingredient();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Ingredient entity, IngredientRequest request) {
        if (request == null) {
            return;
        }
        entity.setICategoryId(request.getICategoryId());
        entity.setIngredientName(request.getIngredientName());
        entity.setUnit(request.getUnit());
        entity.setToppingPrice(request.getToppingPrice());
        entity.setStatus(request.getStatus());
    }

    @Override
    public IngredientResponse toResponse(Ingredient entity) {
        if (entity == null) {
            return null;
        }
        IngredientResponse response = new IngredientResponse();
        response.setIngredientId(entity.getIngredientId());
        response.setICategoryId(entity.getICategoryId());
        response.setIngredientName(entity.getIngredientName());
        response.setUnit(entity.getUnit());
        response.setToppingPrice(entity.getToppingPrice());
        response.setStatus(entity.getStatus());
        return response;
    }
}
