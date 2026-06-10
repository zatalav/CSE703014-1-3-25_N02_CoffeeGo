package com.coffee.productservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.productservice.entity.ProductCategory;
import com.coffee.productservice.mapper.ProductCategoryMapper;
import com.coffee.productservice.repository.ProductCategoryRepository;
import com.coffee.productservice.dto.request.ProductCategoryRequest;
import com.coffee.productservice.dto.response.ProductCategoryResponse;
import com.coffee.productservice.service.ProductCategoryAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ProductCategoryAdminServiceImpl extends CrudServiceSupport<ProductCategory, Long, ProductCategoryRequest, ProductCategoryResponse> implements ProductCategoryAdminService {
    public ProductCategoryAdminServiceImpl(ProductCategoryRepository repository, ProductCategoryMapper mapper) {
        super(repository, repository, mapper, ProductCategory.class, "p_category_id", List.of("pCategoryName"), Map.of(), null);
    }
}
