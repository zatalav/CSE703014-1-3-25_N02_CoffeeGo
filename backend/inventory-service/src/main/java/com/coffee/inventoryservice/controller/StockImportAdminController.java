package com.coffee.inventoryservice.controller;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.inventoryservice.dto.request.StockImportRequest;
import com.coffee.inventoryservice.dto.response.StockImportResponse;
import com.coffee.inventoryservice.repository.BranchRepository;
import com.coffee.inventoryservice.repository.SupplierRepository;
import com.coffee.inventoryservice.service.StockImportAdminService;
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
@RequestMapping("/api/admin/inventory/stock-imports")
@PreAuthorize("hasAnyRole('admin', 'warehouse_manager', 'branch_manager')")
public class StockImportAdminController {
    private final StockImportAdminService service;
    private final BranchRepository branchRepository;
    private final SupplierRepository supplierRepository;

    public StockImportAdminController(
            StockImportAdminService service,
            BranchRepository branchRepository,
            SupplierRepository supplierRepository
    ) {
        this.service = service;
        this.branchRepository = branchRepository;
        this.supplierRepository = supplierRepository;
    }

    @GetMapping
    public ApiResponse<PageResponse<StockImportResponse>> list(@RequestParam Map<String, String> params,
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
    public ApiResponse<StockImportResponse> get(@PathVariable Long id,
                                                @AuthenticationPrincipal AuthenticatedUser user) {
        StockImportResponse stockImport = service.get(id);
        InventoryBranchScope.requireSameBranch(stockImport.getBranchId(), user, "Import note does not belong to your branch");
        return ApiResponse.success(stockImport);
    }

    @PostMapping
    public ApiResponse<StockImportResponse> create(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody StockImportRequest request) {
        if (user != null) {
            request.setEmployeeId(user.getUserId());
        }
        Long branchId = InventoryBranchScope.scopedBranchId(user);
        if (branchId != null) {
            request.setBranchId(branchId);
        }
        validateCreateRequest(request);
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<StockImportResponse> update(@PathVariable Long id,
                                                   @Valid @RequestBody StockImportRequest request,
                                                   @AuthenticationPrincipal AuthenticatedUser user) {
        InventoryBranchScope.requireSameBranch(service.get(id).getBranchId(), user, "Import note does not belong to your branch");
        Long branchId = InventoryBranchScope.scopedBranchId(user);
        if (branchId != null) {
            request.setBranchId(branchId);
        }
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id,
                                    @AuthenticationPrincipal AuthenticatedUser user) {
        InventoryBranchScope.requireSameBranch(service.get(id).getBranchId(), user, "Import note does not belong to your branch");
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }

    private void validateCreateRequest(StockImportRequest request) {
        if (!branchRepository.existsById(request.getBranchId())) {
            throw new BadRequestException("Chi nhanh nhap kho khong hop le");
        }
        if (!supplierRepository.existsById(request.getSupplierId())) {
            throw new BadRequestException("Nha cung cap khong hop le");
        }
        if (request.getEmployeeId() == null) {
            throw new BadRequestException("Nguoi tao phieu khong hop le. Vui long dang nhap lai");
        }
    }
}
