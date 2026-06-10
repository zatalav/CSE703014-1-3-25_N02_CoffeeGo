package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.SeasonalProduct;
import com.coffee.productservice.dto.request.SeasonalProductRequest;
import com.coffee.productservice.dto.response.SeasonalProductResponse;
import org.springframework.stereotype.Component;

@Component
public class SeasonalProductMapper implements DtoMapper<SeasonalProduct, SeasonalProductRequest, SeasonalProductResponse> {
    @Override
    public SeasonalProduct toEntity(SeasonalProductRequest request) {
        SeasonalProduct entity = new SeasonalProduct();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(SeasonalProduct entity, SeasonalProductRequest request) {
        if (request == null) {
            return;
        }
        entity.setSeasonId(request.getSeasonId());
        entity.setProductId(request.getProductId());
    }

    @Override
    public SeasonalProductResponse toResponse(SeasonalProduct entity) {
        if (entity == null) {
            return null;
        }
        SeasonalProductResponse response = new SeasonalProductResponse();
        response.setSeasonId(entity.getSeasonId());
        response.setProductId(entity.getProductId());
        return response;
    }
}
