package com.coffee.contentservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.contentservice.entity.Banner;
import com.coffee.contentservice.dto.request.BannerRequest;
import com.coffee.contentservice.dto.response.BannerResponse;
import org.springframework.stereotype.Component;

@Component
public class BannerMapper implements DtoMapper<Banner, BannerRequest, BannerResponse> {
    @Override
    public Banner toEntity(BannerRequest request) {
        Banner entity = new Banner();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Banner entity, BannerRequest request) {
        if (request == null) {
            return;
        }
        entity.setTitle(request.getTitle());
        entity.setSubtitle(request.getSubtitle());
        entity.setImgUrl(request.getImgUrl());
        entity.setLinkUrl(request.getLinkUrl());
        entity.setPosition(request.getPosition());
        entity.setStatus(request.getStatus());
        entity.setCreatedAt(request.getCreatedAt());
    }

    @Override
    public BannerResponse toResponse(Banner entity) {
        if (entity == null) {
            return null;
        }
        BannerResponse response = new BannerResponse();
        response.setBannerId(entity.getBannerId());
        response.setTitle(entity.getTitle());
        response.setSubtitle(entity.getSubtitle());
        response.setImgUrl(entity.getImgUrl());
        response.setLinkUrl(entity.getLinkUrl());
        response.setPosition(entity.getPosition());
        response.setStatus(entity.getStatus());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
