package com.coffee.contentservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.contentservice.dto.request.NewsRequest;
import com.coffee.contentservice.dto.response.NewsResponse;
import com.coffee.contentservice.service.NewsAdminService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/admin/content/news")
@PreAuthorize("hasRole('admin')")
public class NewsAdminController {
    private final NewsAdminService service;

    public NewsAdminController(NewsAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<NewsResponse>> list(@RequestParam Map<String, String> params, @PageableDefault(size = 10) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<NewsResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PostMapping
    public ApiResponse<NewsResponse> create(@Valid @RequestBody NewsRequest request) {
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<NewsResponse> update(@PathVariable Long id, @Valid @RequestBody NewsRequest request) {
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @PatchMapping("/{id}/publish")
    public ApiResponse<NewsResponse> publish(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "published"));
    }

    @PatchMapping("/{id}/archive")
    public ApiResponse<NewsResponse> archive(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "archived"));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }
}
