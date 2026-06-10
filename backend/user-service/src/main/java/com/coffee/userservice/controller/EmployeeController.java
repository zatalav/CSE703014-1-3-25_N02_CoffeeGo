package com.coffee.userservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.userservice.dto.request.EmployeeRequest;
import com.coffee.userservice.dto.response.EmployeeResponse;
import com.coffee.userservice.service.EmployeeAdminService;
import jakarta.validation.Valid;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.AccessDeniedException;
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
@RequestMapping("/api/employees")
@PreAuthorize("hasAnyRole('admin', 'branch_manager')")
public class EmployeeController {
    private final EmployeeAdminService service;

    public EmployeeController(EmployeeAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<EmployeeResponse>> list(@RequestParam Map<String, String> params,
                                                            @PageableDefault(size = 100) Pageable pageable,
                                                            @AuthenticationPrincipal AuthenticatedUser user) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        Long scopedBranchId = scopedBranchId(user);
        if (scopedBranchId != null) {
            filters.put("branchId", String.valueOf(scopedBranchId));
        }
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @PostMapping
    public ApiResponse<EmployeeResponse> create(@Valid @RequestBody EmployeeRequest request,
                                                @AuthenticationPrincipal AuthenticatedUser user) {
        applyBranchScope(request, user);
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<EmployeeResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody EmployeeRequest request,
                                                @AuthenticationPrincipal AuthenticatedUser user) {
        assertSameBranch(id, user);
        applyBranchScope(request, user);
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @PatchMapping("/{id}/lock")
    public ApiResponse<EmployeeResponse> lock(@PathVariable Long id,
                                              @AuthenticationPrincipal AuthenticatedUser user) {
        assertSameBranch(id, user);
        return ApiResponse.success("Status updated", service.setStatus(id, "inactive"));
    }

    @PatchMapping("/{id}/unlock")
    public ApiResponse<EmployeeResponse> unlock(@PathVariable Long id,
                                                @AuthenticationPrincipal AuthenticatedUser user) {
        assertSameBranch(id, user);
        return ApiResponse.success("Status updated", service.setStatus(id, "active"));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id,
                                    @AuthenticationPrincipal AuthenticatedUser user) {
        assertSameBranch(id, user);
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }

    private void applyBranchScope(EmployeeRequest request, AuthenticatedUser user) {
        Long branchId = scopedBranchId(user);
        if (branchId != null) {
            request.setBranchId(branchId);
        }
    }

    private void assertSameBranch(Long employeeId, AuthenticatedUser user) {
        Long branchId = scopedBranchId(user);
        if (branchId == null) {
            return;
        }
        EmployeeResponse employee = service.get(employeeId);
        if (!branchId.equals(employee.getBranchId())) {
            throw new AccessDeniedException("Employee does not belong to your branch");
        }
    }

    private Long scopedBranchId(AuthenticatedUser user) {
        if (user == null || user.getRoleName() == null) {
            return null;
        }
        String role = Normalizer.normalize(user.getRoleName(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('_', ' ')
                .trim();
        boolean branchManager = "branch manager".equals(role)
                || role.contains("quan ly chi nhanh")
                || role.contains("quan ly ban hang")
                || role.contains("sales manager")
                || role.contains("sale manager");
        return branchManager ? user.getBranchId() : null;
    }
}
