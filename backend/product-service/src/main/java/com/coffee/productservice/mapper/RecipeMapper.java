package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.Recipe;
import com.coffee.productservice.dto.request.RecipeRequest;
import com.coffee.productservice.dto.response.RecipeResponse;
import org.springframework.stereotype.Component;

@Component
public class RecipeMapper implements DtoMapper<Recipe, RecipeRequest, RecipeResponse> {
    @Override
    public Recipe toEntity(RecipeRequest request) {
        Recipe entity = new Recipe();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Recipe entity, RecipeRequest request) {
        if (request == null) {
            return;
        }
        entity.setProductId(request.getProductId());
        entity.setRecipeName(request.getRecipeName());
        entity.setDescription(request.getDescription());
    }

    @Override
    public RecipeResponse toResponse(Recipe entity) {
        if (entity == null) {
            return null;
        }
        RecipeResponse response = new RecipeResponse();
        response.setRecipeId(entity.getRecipeId());
        response.setProductId(entity.getProductId());
        response.setRecipeName(entity.getRecipeName());
        response.setDescription(entity.getDescription());
        return response;
    }
}
