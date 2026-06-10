package com.coffee.customerservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.customerservice.dto.request.ProductReviewRequest;
import com.coffee.customerservice.dto.response.ProductReviewResponse;
import com.coffee.customerservice.service.ProductReviewAdminService;
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
@RequestMapping("/api/admin/customers/reviews")
@PreAuthorize("hasRole('admin')")
public class ProductReviewAdminController {
    private final ProductReviewAdminService service;

    public ProductReviewAdminController(ProductReviewAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<ProductReviewResponse>> list(@RequestParam Map<String, String> params, @PageableDefault(size = 10) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductReviewResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PatchMapping("/{id}/hide")
    public ApiResponse<ProductReviewResponse> hide(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "inactive"));
    }
}
