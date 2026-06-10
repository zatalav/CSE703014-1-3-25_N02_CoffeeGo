package com.coffee.productservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.productservice.entity.ProductSize;
import com.coffee.productservice.mapper.ProductSizeMapper;
import com.coffee.productservice.repository.ProductSizeRepository;
import com.coffee.productservice.dto.request.ProductSizeRequest;
import com.coffee.productservice.dto.response.ProductSizeResponse;
import com.coffee.productservice.service.ProductSizeAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ProductSizeAdminServiceImpl extends CrudServiceSupport<ProductSize, Long, ProductSizeRequest, ProductSizeResponse> implements ProductSizeAdminService {
    public ProductSizeAdminServiceImpl(ProductSizeRepository repository, ProductSizeMapper mapper) {
        super(repository, repository, mapper, ProductSize.class, "size_id", List.of("size", "status"), Map.of("productId", "productId", "status", "status"), null);
    }
}
