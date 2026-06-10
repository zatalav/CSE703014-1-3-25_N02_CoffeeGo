package com.coffee.productservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.productservice.entity.Recipe;
import com.coffee.productservice.mapper.RecipeMapper;
import com.coffee.productservice.repository.RecipeDetailRepository;
import com.coffee.productservice.repository.RecipeRepository;
import com.coffee.productservice.dto.request.RecipeRequest;
import com.coffee.productservice.dto.response.RecipeResponse;
import com.coffee.productservice.service.RecipeAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecipeAdminServiceImpl extends CrudServiceSupport<Recipe, Long, RecipeRequest, RecipeResponse> implements RecipeAdminService {
    private final RecipeDetailRepository recipeDetailRepository;

    public RecipeAdminServiceImpl(RecipeRepository repository,
                                  RecipeMapper mapper,
                                  RecipeDetailRepository recipeDetailRepository) {
        super(repository, repository, mapper, Recipe.class, "recipe_id", List.of("recipeName", "description"), Map.of("productId", "productId"), null);
        this.recipeDetailRepository = recipeDetailRepository;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        recipeDetailRepository.deleteByRecipeIdIn(List.of(id));
        super.delete(id);
    }
}
