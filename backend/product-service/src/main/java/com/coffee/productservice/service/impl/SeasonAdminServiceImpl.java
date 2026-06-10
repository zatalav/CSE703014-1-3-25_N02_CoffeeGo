package com.coffee.productservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.productservice.entity.Season;
import com.coffee.productservice.mapper.SeasonMapper;
import com.coffee.productservice.repository.SeasonRepository;
import com.coffee.productservice.dto.request.SeasonRequest;
import com.coffee.productservice.dto.response.SeasonResponse;
import com.coffee.productservice.service.SeasonAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SeasonAdminServiceImpl extends CrudServiceSupport<Season, Long, SeasonRequest, SeasonResponse> implements SeasonAdminService {
    public SeasonAdminServiceImpl(SeasonRepository repository, SeasonMapper mapper) {
        super(repository, repository, mapper, Season.class, "season_id", List.of("seasonName"), Map.of("status", "status"), "startDate");
    }
}
