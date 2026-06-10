package com.coffee.contentservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.contentservice.entity.News;
import com.coffee.contentservice.dto.request.NewsRequest;
import com.coffee.contentservice.dto.response.NewsResponse;
import org.springframework.stereotype.Component;

@Component
public class NewsMapper implements DtoMapper<News, NewsRequest, NewsResponse> {
    @Override
    public News toEntity(NewsRequest request) {
        News entity = new News();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(News entity, NewsRequest request) {
        if (request == null) {
            return;
        }
        entity.setEmployeeId(request.getEmployeeId());
        entity.setCategory(request.getCategory());
        entity.setTitle(request.getTitle());
        entity.setSlug(request.getSlug());
        entity.setThumbnail(request.getThumbnail());
        entity.setSummary(request.getSummary());
        entity.setStatus(request.getStatus());
        entity.setCreatedAt(request.getCreatedAt());
        entity.setUpdatedAt(request.getUpdatedAt());
    }

    @Override
    public NewsResponse toResponse(News entity) {
        if (entity == null) {
            return null;
        }
        NewsResponse response = new NewsResponse();
        response.setNewsId(entity.getNewsId());
        response.setEmployeeId(entity.getEmployeeId());
        response.setCategory(entity.getCategory());
        response.setTitle(entity.getTitle());
        response.setSlug(entity.getSlug());
        response.setThumbnail(entity.getThumbnail());
        response.setSummary(entity.getSummary());
        response.setStatus(entity.getStatus());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }
}
