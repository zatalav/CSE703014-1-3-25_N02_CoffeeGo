package com.coffee.contentservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.contentservice.dto.request.NewsRequest;
import com.coffee.contentservice.dto.response.NewsResponse;

public interface NewsAdminService extends CrudService<NewsRequest, NewsResponse, Long> {
}
