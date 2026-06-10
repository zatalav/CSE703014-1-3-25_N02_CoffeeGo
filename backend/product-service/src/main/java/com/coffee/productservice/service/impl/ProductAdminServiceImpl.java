package com.coffee.productservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.productservice.entity.Product;
import com.coffee.productservice.mapper.ProductMapper;
import com.coffee.productservice.repository.ProductRepository;
import com.coffee.productservice.dto.request.ProductRequest;
import com.coffee.productservice.dto.response.ProductResponse;
import com.coffee.productservice.entity.Recipe;
import com.coffee.productservice.service.ProductAdminService;
import com.coffee.productservice.repository.RecipeDetailRepository;
import com.coffee.productservice.repository.RecipeRepository;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductAdminServiceImpl extends CrudServiceSupport<Product, Long, ProductRequest, ProductResponse> implements ProductAdminService {
    private final RecipeRepository recipeRepository;
    private final RecipeDetailRepository recipeDetailRepository;

    public ProductAdminServiceImpl(ProductRepository repository,
                                   ProductMapper mapper,
                                   RecipeRepository recipeRepository,
                                   RecipeDetailRepository recipeDetailRepository) {
        super(repository, repository, mapper, Product.class, "product_id", List.of("productName", "description"), Map.of("categoryId", "pCategoryId", "status", "status", "productId", "productId"), "createdAt");
        this.recipeRepository = recipeRepository;
        this.recipeDetailRepository = recipeDetailRepository;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        List<Long> recipeIds = recipeRepository.findByProductId(id).stream()
                .map(Recipe::getRecipeId)
                .toList();
        if (!recipeIds.isEmpty()) {
            recipeDetailRepository.deleteByRecipeIdIn(recipeIds);
            recipeRepository.deleteByProductId(id);
        }
        super.delete(id);
    }
}
