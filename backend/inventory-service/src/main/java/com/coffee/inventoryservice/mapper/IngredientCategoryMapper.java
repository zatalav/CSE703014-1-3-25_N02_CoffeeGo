package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.IngredientCategory;
import com.coffee.inventoryservice.dto.request.IngredientCategoryRequest;
import com.coffee.inventoryservice.dto.response.IngredientCategoryResponse;
import org.springframework.stereotype.Component;

@Component
public class IngredientCategoryMapper implements DtoMapper<IngredientCategory, IngredientCategoryRequest, IngredientCategoryResponse> {
    @Override
    public IngredientCategory toEntity(IngredientCategoryRequest request) {
        IngredientCategory entity = new IngredientCategory();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(IngredientCategory entity, IngredientCategoryRequest request) {
        if (request == null) {
            return;
        }
        entity.setICategoryName(request.getICategoryName());
    }

    @Override
    public IngredientCategoryResponse toResponse(IngredientCategory entity) {
        if (entity == null) {
            return null;
        }
        IngredientCategoryResponse response = new IngredientCategoryResponse();
        response.setICategoryId(entity.getICategoryId());
        response.setICategoryName(entity.getICategoryName());
        return response;
    }
}
