package com.coffee.branchservice.controller;

import com.coffee.branchservice.dto.request.BranchHoursRequest;
import com.coffee.branchservice.dto.request.BranchRequest;
import com.coffee.branchservice.dto.response.BranchHoursResponse;
import com.coffee.branchservice.dto.response.BranchResponse;
import com.coffee.branchservice.service.BranchService;
import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
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
@RequestMapping("/api/branches")
public class BranchController {
    private final BranchService branchService;

    public BranchController(BranchService branchService) {
        this.branchService = branchService;
    }

    @GetMapping
    public ApiResponse<PageResponse<BranchResponse>> list(
            @RequestParam Map<String, String> params,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(branchService.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<BranchResponse> get(@PathVariable Long id) {
        return ApiResponse.success(branchService.get(id));
    }

    @PostMapping
    public ApiResponse<BranchResponse> create(@Valid @RequestBody BranchRequest request) {
        return ApiResponse.success("Created", branchService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<BranchResponse> update(@PathVariable Long id, @Valid @RequestBody BranchRequest request) {
        return ApiResponse.success("Updated", branchService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        branchService.delete(id);
        return ApiResponse.success("Deleted", null);
    }

    @GetMapping("/{id}/hours")
    public ApiResponse<List<BranchHoursResponse>> getHours(@PathVariable Long id) {
        return ApiResponse.success(branchService.getHours(id));
    }

    @PutMapping("/{id}/hours")
    public ApiResponse<List<BranchHoursResponse>> updateHours(
            @PathVariable Long id,
            @Valid @RequestBody List<BranchHoursRequest> requests
    ) {
        return ApiResponse.success("Updated", branchService.updateHours(id, requests));
    }
}
