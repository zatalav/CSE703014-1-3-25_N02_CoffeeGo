package com.coffee.productservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.productservice.dto.request.ComboRequest;
import com.coffee.productservice.dto.response.ComboResponse;
import com.coffee.productservice.repository.ComboDetailRepository;
import com.coffee.productservice.service.ComboAdminService;
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
@RequestMapping("/api/admin/products/combos")
@PreAuthorize("hasRole('admin')")
public class ComboAdminController {
    private final ComboAdminService service;
    private final ComboDetailRepository comboDetailRepository;

    public ComboAdminController(ComboAdminService service, ComboDetailRepository comboDetailRepository) {
        this.service = service;
        this.comboDetailRepository = comboDetailRepository;
    }

    @GetMapping
    public ApiResponse<PageResponse<ComboResponse>> list(@RequestParam Map<String, String> params, @PageableDefault(size = 10) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ComboResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PostMapping
    public ApiResponse<ComboResponse> create(@Valid @RequestBody ComboRequest request) {
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<ComboResponse> update(@PathVariable Long id, @Valid @RequestBody ComboRequest request) {
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @PatchMapping("/{id}/hide")
    public ApiResponse<ComboResponse> hide(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "inactive"));
    }

    @PatchMapping("/{id}/show")
    public ApiResponse<ComboResponse> show(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "active"));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        comboDetailRepository.findAll().stream()
                .filter(item -> id.equals(item.getComboId()))
                .forEach(comboDetailRepository::delete);
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }
}
