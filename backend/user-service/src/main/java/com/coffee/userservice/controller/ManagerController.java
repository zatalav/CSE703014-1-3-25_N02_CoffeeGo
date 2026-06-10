package com.coffee.userservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.userservice.dto.request.EmployeeRequest;
import com.coffee.userservice.dto.response.EmployeeResponse;
import com.coffee.userservice.service.ManagerAdminService;
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
@RequestMapping("/api/managers")
@PreAuthorize("hasRole('admin')")
public class ManagerController {
    private final ManagerAdminService service;

    public ManagerController(ManagerAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<EmployeeResponse>> list(@RequestParam Map<String, String> params, @PageableDefault(size = 100) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @PostMapping
    public ApiResponse<EmployeeResponse> create(@Valid @RequestBody EmployeeRequest request) {
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<EmployeeResponse> update(@PathVariable Long id, @Valid @RequestBody EmployeeRequest request) {
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @PatchMapping("/{id}/lock")
    public ApiResponse<EmployeeResponse> lock(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "inactive"));
    }

    @PatchMapping("/{id}/unlock")
    public ApiResponse<EmployeeResponse> unlock(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "active"));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }
}
