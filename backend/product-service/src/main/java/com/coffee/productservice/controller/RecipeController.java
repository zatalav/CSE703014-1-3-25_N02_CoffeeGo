package com.coffee.productservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.productservice.dto.request.RecipeRequest;
import com.coffee.productservice.dto.response.RecipeResponse;
import com.coffee.productservice.service.RecipeAdminService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/products/recipes")
public class RecipeController {
    private final RecipeAdminService service;

    public RecipeController(RecipeAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<RecipeResponse>> list(@RequestParam Map<String, String> params, @PageableDefault(size = 10) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<RecipeResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PostMapping
    public ApiResponse<RecipeResponse> create(@Valid @RequestBody RecipeRequest request) {
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<RecipeResponse> update(@PathVariable Long id, @Valid @RequestBody RecipeRequest request) {
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }
}
