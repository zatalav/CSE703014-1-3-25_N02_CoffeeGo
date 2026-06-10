package com.coffee.productservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.productservice.dto.request.SeasonRequest;
import com.coffee.productservice.dto.response.SeasonResponse;
import com.coffee.productservice.service.SeasonAdminService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/products/seasons")
public class SeasonController {
    private final SeasonAdminService service;

    public SeasonController(SeasonAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<SeasonResponse>> list(@RequestParam Map<String, String> params, @PageableDefault(size = 100) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<SeasonResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PostMapping
    public ApiResponse<SeasonResponse> create(@Valid @RequestBody SeasonRequest request) {
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<SeasonResponse> update(@PathVariable Long id, @Valid @RequestBody SeasonRequest request) {
        return ApiResponse.success("Updated", service.update(id, request));
    }
}
