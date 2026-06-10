package com.coffee.productservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.productservice.entity.Ingredient;
import com.coffee.productservice.mapper.IngredientMapper;
import com.coffee.productservice.repository.IngredientRepository;
import com.coffee.productservice.dto.request.IngredientRequest;
import com.coffee.productservice.dto.response.IngredientResponse;
import com.coffee.productservice.service.ToppingAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ToppingAdminServiceImpl extends CrudServiceSupport<Ingredient, Long, IngredientRequest, IngredientResponse> implements ToppingAdminService {
    public ToppingAdminServiceImpl(IngredientRepository repository, IngredientMapper mapper) {
        super(repository, repository, mapper, Ingredient.class, "ingredient_id", List.of("ingredientName"), Map.of("categoryId", "iCategoryId", "status", "status", "ingredientId", "ingredientId"), null);
    }
}
