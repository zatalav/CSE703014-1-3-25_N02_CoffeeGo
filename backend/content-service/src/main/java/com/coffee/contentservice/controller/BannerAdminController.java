package com.coffee.contentservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.contentservice.dto.request.BannerRequest;
import com.coffee.contentservice.dto.response.BannerResponse;
import com.coffee.contentservice.service.BannerAdminService;
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
@RequestMapping("/api/admin/content/banners")
@PreAuthorize("hasRole('admin')")
public class BannerAdminController {
    private final BannerAdminService service;

    public BannerAdminController(BannerAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<BannerResponse>> list(@RequestParam Map<String, String> params, @PageableDefault(size = 10) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<BannerResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PostMapping
    public ApiResponse<BannerResponse> create(@Valid @RequestBody BannerRequest request) {
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<BannerResponse> update(@PathVariable Long id, @Valid @RequestBody BannerRequest request) {
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @PatchMapping("/{id}/active")
    public ApiResponse<BannerResponse> active(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "active"));
    }

    @PatchMapping("/{id}/inactive")
    public ApiResponse<BannerResponse> inactive(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "inactive"));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }
}
