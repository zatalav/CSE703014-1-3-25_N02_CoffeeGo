package com.coffee.branchservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.branchservice.dto.request.WorkScheduleRequest;
import com.coffee.branchservice.dto.response.WorkScheduleResponse;
import com.coffee.branchservice.service.WorkScheduleAdminService;
import jakarta.validation.Valid;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.AccessDeniedException;
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
@RequestMapping("/api/admin/work-schedules")
@PreAuthorize("hasAnyRole('admin', 'branch_manager')")
public class WorkScheduleAdminController {
    private final WorkScheduleAdminService service;

    public WorkScheduleAdminController(WorkScheduleAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<WorkScheduleResponse>> list(@RequestParam Map<String, String> params,
                                                                @PageableDefault(size = 10) Pageable pageable,
                                                                @AuthenticationPrincipal AuthenticatedUser user) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        Long branchId = scopedBranchId(user);
        if (branchId != null) {
            filters.put("branchId", String.valueOf(branchId));
        }
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<WorkScheduleResponse> get(@PathVariable Long id,
                                                 @AuthenticationPrincipal AuthenticatedUser user) {
        WorkScheduleResponse schedule = service.get(id);
        assertSameBranch(schedule, user);
        return ApiResponse.success(schedule);
    }

    @PostMapping
    public ApiResponse<WorkScheduleResponse> create(@Valid @RequestBody WorkScheduleRequest request,
                                                    @AuthenticationPrincipal AuthenticatedUser user) {
        applyBranchScope(request, user);
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<WorkScheduleResponse> update(@PathVariable Long id,
                                                    @Valid @RequestBody WorkScheduleRequest request,
                                                    @AuthenticationPrincipal AuthenticatedUser user) {
        assertSameBranch(service.get(id), user);
        applyBranchScope(request, user);
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id,
                                    @AuthenticationPrincipal AuthenticatedUser user) {
        assertSameBranch(service.get(id), user);
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }

    private void applyBranchScope(WorkScheduleRequest request, AuthenticatedUser user) {
        Long branchId = scopedBranchId(user);
        if (branchId != null) {
            request.setBranchId(branchId);
        }
    }

    private void assertSameBranch(WorkScheduleResponse schedule, AuthenticatedUser user) {
        Long branchId = scopedBranchId(user);
        if (branchId != null && !branchId.equals(schedule.getBranchId())) {
            throw new AccessDeniedException("Work schedule does not belong to your branch");
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
