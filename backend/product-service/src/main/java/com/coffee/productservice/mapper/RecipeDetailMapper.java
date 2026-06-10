package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.RecipeDetail;
import com.coffee.productservice.dto.request.RecipeDetailRequest;
import com.coffee.productservice.dto.response.RecipeDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class RecipeDetailMapper implements DtoMapper<RecipeDetail, RecipeDetailRequest, RecipeDetailResponse> {
    @Override
    public RecipeDetail toEntity(RecipeDetailRequest request) {
        RecipeDetail entity = new RecipeDetail();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(RecipeDetail entity, RecipeDetailRequest request) {
        if (request == null) {
            return;
        }
        entity.setRecipeId(request.getRecipeId());
        entity.setIngredientId(request.getIngredientId());
        entity.setQuantity(request.getQuantity());
        entity.setUnit(request.getUnit());
        entity.setSize(request.getSize());
        entity.setEstimatedTotal(request.getEstimatedTotal());
    }

    @Override
    public RecipeDetailResponse toResponse(RecipeDetail entity) {
        if (entity == null) {
            return null;
        }
        RecipeDetailResponse response = new RecipeDetailResponse();
        response.setRecipeDetailId(entity.getRecipeDetailId());
        response.setRecipeId(entity.getRecipeId());
        response.setIngredientId(entity.getIngredientId());
        response.setQuantity(entity.getQuantity());
        response.setUnit(entity.getUnit());
        response.setSize(entity.getSize());
        response.setEstimatedTotal(entity.getEstimatedTotal());
        return response;
    }
}
