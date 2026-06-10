package com.coffee.contentservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.contentservice.entity.Banner;
import com.coffee.contentservice.mapper.BannerMapper;
import com.coffee.contentservice.repository.BannerRepository;
import com.coffee.contentservice.dto.request.BannerRequest;
import com.coffee.contentservice.dto.response.BannerResponse;
import com.coffee.contentservice.service.BannerAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BannerAdminServiceImpl extends CrudServiceSupport<Banner, Long, BannerRequest, BannerResponse> implements BannerAdminService {
    public BannerAdminServiceImpl(BannerRepository repository, BannerMapper mapper) {
        super(repository, repository, mapper, Banner.class, "banner_id", List.of("title", "subtitle"), Map.of("status", "status"), "createdAt");
    }
}
