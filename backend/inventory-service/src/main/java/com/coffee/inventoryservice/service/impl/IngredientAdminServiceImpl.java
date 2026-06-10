package com.coffee.inventoryservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.inventoryservice.entity.Ingredient;
import com.coffee.inventoryservice.mapper.IngredientMapper;
import com.coffee.inventoryservice.repository.IngredientRepository;
import com.coffee.inventoryservice.dto.request.IngredientRequest;
import com.coffee.inventoryservice.dto.response.IngredientResponse;
import com.coffee.inventoryservice.service.IngredientAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class IngredientAdminServiceImpl extends CrudServiceSupport<Ingredient, Long, IngredientRequest, IngredientResponse> implements IngredientAdminService {
    public IngredientAdminServiceImpl(IngredientRepository repository, IngredientMapper mapper) {
        super(repository, repository, mapper, Ingredient.class, "ingredient_id", List.of("ingredientName"), Map.of("categoryId", "iCategoryId", "status", "status", "ingredientId", "ingredientId"), null);
    }
}
