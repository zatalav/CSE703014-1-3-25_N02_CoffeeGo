package com.coffee.inventoryservice.service;

import com.coffee.common.response.PageResponse;
import com.coffee.inventoryservice.dto.request.SupplierFormRequest;
import com.coffee.inventoryservice.dto.response.SupplierFormResponse;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface SupplierPublicService {
    PageResponse<SupplierFormResponse> list(String keyword, Map<String, String> filters, Pageable pageable);
    SupplierFormResponse get(Long id);
    SupplierFormResponse create(SupplierFormRequest request);
    SupplierFormResponse update(Long id, SupplierFormRequest request);
    SupplierFormResponse setStatus(Long id, String status);
    void delete(Long id);
}
