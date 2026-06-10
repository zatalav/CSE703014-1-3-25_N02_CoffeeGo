package com.coffee.productservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.productservice.entity.Season;
import com.coffee.productservice.dto.request.SeasonRequest;
import com.coffee.productservice.dto.response.SeasonResponse;
import org.springframework.stereotype.Component;

@Component
public class SeasonMapper implements DtoMapper<Season, SeasonRequest, SeasonResponse> {
    @Override
    public Season toEntity(SeasonRequest request) {
        Season entity = new Season();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Season entity, SeasonRequest request) {
        if (request == null) {
            return;
        }
        entity.setSeasonName(request.getSeasonName());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setStatus(request.getStatus());
    }

    @Override
    public SeasonResponse toResponse(Season entity) {
        if (entity == null) {
            return null;
        }
        SeasonResponse response = new SeasonResponse();
        response.setSeasonId(entity.getSeasonId());
        response.setSeasonName(entity.getSeasonName());
        response.setStartDate(entity.getStartDate());
        response.setEndDate(entity.getEndDate());
        response.setStatus(entity.getStatus());
        return response;
    }
}
