package com.coffee.inventoryservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.inventoryservice.dto.request.RestockRequestCreateRequest;
import com.coffee.inventoryservice.dto.request.RestockRequestStatusRequest;
import com.coffee.inventoryservice.dto.response.RestockRequestResponse;
import com.coffee.inventoryservice.service.RestockRequestService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/admin/inventory/restock-requests")
@PreAuthorize("hasAnyRole('admin', 'warehouse_manager', 'branch_manager')")
public class RestockRequestAdminController {

    private final RestockRequestService service;

    public RestockRequestAdminController(RestockRequestService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<RestockRequestResponse>> list(@RequestParam Map<String, String> params,
                                                                  @PageableDefault(size = 20) Pageable pageable,
                                                                  @AuthenticationPrincipal AuthenticatedUser user) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        if (InventoryBranchScope.isBranchManager(user) && user.getBranchId() != null) {
            filters.put("branchId", String.valueOf(user.getBranchId()));
        }
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<RestockRequestResponse> get(@PathVariable Long id,
                                                   @AuthenticationPrincipal AuthenticatedUser user) {
        RestockRequestResponse response = service.get(id);
        if (InventoryBranchScope.isBranchManager(user)) {
            InventoryBranchScope.requireSameBranch(response.getBranchId(), user, "Restock request does not belong to your branch");
        }
        return ApiResponse.success(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('admin', 'branch_manager')")
    public ApiResponse<RestockRequestResponse> create(@AuthenticationPrincipal AuthenticatedUser user,
                                                      @Valid @RequestBody RestockRequestCreateRequest request) {
        if (user != null) {
            request.setEmployeeId(user.getUserId());
        }
        if (InventoryBranchScope.isBranchManager(user) && user.getBranchId() != null) {
            request.setBranchId(user.getBranchId());
        }
        return ApiResponse.success("Created", service.create(request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('admin', 'warehouse_manager')")
    public ApiResponse<RestockRequestResponse> updateStatus(@PathVariable Long id,
                                                            @Valid @RequestBody RestockRequestStatusRequest request) {
        return ApiResponse.success("Updated", service.updateStatus(id, request.getStatus()));
    }
}
