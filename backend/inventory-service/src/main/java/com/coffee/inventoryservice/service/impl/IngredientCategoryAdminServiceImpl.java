package com.coffee.inventoryservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.inventoryservice.entity.IngredientCategory;
import com.coffee.inventoryservice.mapper.IngredientCategoryMapper;
import com.coffee.inventoryservice.repository.IngredientCategoryRepository;
import com.coffee.inventoryservice.dto.request.IngredientCategoryRequest;
import com.coffee.inventoryservice.dto.response.IngredientCategoryResponse;
import com.coffee.inventoryservice.service.IngredientCategoryAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class IngredientCategoryAdminServiceImpl extends CrudServiceSupport<IngredientCategory, Long, IngredientCategoryRequest, IngredientCategoryResponse> implements IngredientCategoryAdminService {
    public IngredientCategoryAdminServiceImpl(IngredientCategoryRepository repository, IngredientCategoryMapper mapper) {
        super(repository, repository, mapper, IngredientCategory.class, "i_category_id", List.of("iCategoryName"), Map.of(), null);
    }
}
