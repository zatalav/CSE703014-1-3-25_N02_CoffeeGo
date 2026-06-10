package com.coffee.inventoryservice.service;

import com.coffee.common.response.PageResponse;
import com.coffee.inventoryservice.dto.request.RestockRequestCreateRequest;
import com.coffee.inventoryservice.dto.response.RestockRequestResponse;
import java.util.Map;
import org.springframework.data.domain.Pageable;

public interface RestockRequestService {
    PageResponse<RestockRequestResponse> list(String keyword, Map<String, String> filters, Pageable pageable);
    RestockRequestResponse get(Long id);
    RestockRequestResponse create(RestockRequestCreateRequest request);
    RestockRequestResponse updateStatus(Long id, String status);
}
