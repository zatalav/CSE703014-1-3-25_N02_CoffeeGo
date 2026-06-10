package com.coffee.inventoryservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.inventoryservice.dto.request.WarehouseLocationRequest;
import com.coffee.inventoryservice.dto.response.WarehouseLocationResponse;
import com.coffee.inventoryservice.service.WarehouseLocationAdminService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RequestMapping("/api/admin/inventory/locations")
@PreAuthorize("hasAnyRole('admin', 'warehouse_manager', 'branch_manager')")
public class WarehouseLocationAdminController {
    private final WarehouseLocationAdminService service;

    public WarehouseLocationAdminController(WarehouseLocationAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<WarehouseLocationResponse>> list(@RequestParam Map<String, String> params,
                                                                     @PageableDefault(size = 10) Pageable pageable,
                                                                     @AuthenticationPrincipal AuthenticatedUser user) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        Long branchId = InventoryBranchScope.scopedBranchId(user);
        if (branchId != null) {
            filters.put("branchId", String.valueOf(branchId));
        }
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<WarehouseLocationResponse> get(@PathVariable Long id,
                                                      @AuthenticationPrincipal AuthenticatedUser user) {
        WarehouseLocationResponse location = service.get(id);
        InventoryBranchScope.requireSameBranch(location.getBranchId(), user, "Location does not belong to your branch");
        return ApiResponse.success(location);
    }

    @PostMapping
    public ApiResponse<WarehouseLocationResponse> create(@Valid @RequestBody WarehouseLocationRequest request,
                                                         @AuthenticationPrincipal AuthenticatedUser user) {
        applyBranchScope(request, user);
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<WarehouseLocationResponse> update(@PathVariable Long id,
                                                         @Valid @RequestBody WarehouseLocationRequest request,
                                                         @AuthenticationPrincipal AuthenticatedUser user) {
        InventoryBranchScope.requireSameBranch(service.get(id).getBranchId(), user, "Location does not belong to your branch");
        applyBranchScope(request, user);
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id,
                                    @AuthenticationPrincipal AuthenticatedUser user) {
        InventoryBranchScope.requireSameBranch(service.get(id).getBranchId(), user, "Location does not belong to your branch");
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }

    private void applyBranchScope(WarehouseLocationRequest request, AuthenticatedUser user) {
        Long branchId = InventoryBranchScope.scopedBranchId(user);
        if (branchId != null) {
            request.setBranchId(branchId);
        }
    }
}
