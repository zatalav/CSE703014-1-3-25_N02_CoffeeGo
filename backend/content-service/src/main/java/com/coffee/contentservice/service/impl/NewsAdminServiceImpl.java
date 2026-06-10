package com.coffee.contentservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.contentservice.entity.News;
import com.coffee.contentservice.mapper.NewsMapper;
import com.coffee.contentservice.repository.NewsRepository;
import com.coffee.contentservice.dto.request.NewsRequest;
import com.coffee.contentservice.dto.response.NewsResponse;
import com.coffee.contentservice.service.NewsAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class NewsAdminServiceImpl extends CrudServiceSupport<News, Long, NewsRequest, NewsResponse> implements NewsAdminService {
    public NewsAdminServiceImpl(NewsRepository repository, NewsMapper mapper) {
        super(repository, repository, mapper, News.class, "news_id", List.of("title", "summary"), Map.of("status", "status", "category", "category", "employeeId", "employeeId"), "createdAt");
    }
}
