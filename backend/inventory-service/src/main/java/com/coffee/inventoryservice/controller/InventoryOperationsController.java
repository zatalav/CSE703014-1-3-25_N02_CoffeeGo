package com.coffee.inventoryservice.controller;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.common.security.AuthenticatedUser;
    import com.coffee.inventoryservice.dto.request.SupplierIngredientRequest;
    import com.coffee.inventoryservice.entity.SupplierIngredient;
    import com.coffee.inventoryservice.entity.SupplierIngredientId;
    import com.coffee.inventoryservice.mapper.SupplierIngredientMapper;
    import com.coffee.inventoryservice.repository.SupplierIngredientRepository;
    import com.coffee.inventoryservice.repository.WarehouseStockRepository;
    import java.util.List;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.security.core.annotation.AuthenticationPrincipal;
    import org.springframework.web.bind.annotation.DeleteMapping;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.PutMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/inventory")
    @PreAuthorize("hasAnyRole('admin', 'warehouse_manager', 'branch_manager')")
    public class InventoryOperationsController {
        private final SupplierIngredientRepository supplierIngredientRepository;
        private final SupplierIngredientMapper supplierIngredientMapper;
        private final WarehouseStockRepository stockRepository;

        public InventoryOperationsController(SupplierIngredientRepository supplierIngredientRepository,
                                             SupplierIngredientMapper supplierIngredientMapper,
                                             WarehouseStockRepository stockRepository) {
            this.supplierIngredientRepository = supplierIngredientRepository;
            this.supplierIngredientMapper = supplierIngredientMapper;
            this.stockRepository = stockRepository;
        }

        @GetMapping("/suppliers/{id}/ingredients")
        public ApiResponse<List<?>> supplierIngredients(@PathVariable Long id) {
            return ApiResponse.success(supplierIngredientRepository.findAll().stream()
                    .filter(item -> id.equals(item.getSupplierId()))
                    .map(supplierIngredientMapper::toResponse)
                    .toList());
        }

        @PostMapping("/suppliers/{id}/ingredients")
        public ApiResponse<?> addSupplierIngredient(@PathVariable Long id, @RequestBody SupplierIngredientRequest request) {
            request.setSupplierId(id);
            SupplierIngredient entity = supplierIngredientMapper.toEntity(request);
            return ApiResponse.success(supplierIngredientMapper.toResponse(supplierIngredientRepository.save(entity)));
        }

        @DeleteMapping("/suppliers/{id}/ingredients/{ingredientId}")
        public ApiResponse<Void> deleteSupplierIngredient(@PathVariable Long id, @PathVariable Long ingredientId) {
            SupplierIngredientId key = new SupplierIngredientId();
            key.setSupplierId(id);
            key.setIngredientId(ingredientId);
            supplierIngredientRepository.deleteById(key);
            return ApiResponse.success("Supplier ingredient removed", null);
        }

        @GetMapping("/stocks/low-stock")
        public ApiResponse<?> lowStock(@AuthenticationPrincipal AuthenticatedUser user) {
            Long branchId = InventoryBranchScope.scopedBranchId(user);
            return ApiResponse.success(stockRepository.findAll().stream()
                    .filter(item -> branchId == null || branchId.equals(item.getBranchId()))
                    .filter(item -> item.getQuantity() != null && item.getMinQuantity() != null && item.getQuantity() < item.getMinQuantity())
                    .toList());
        }

        @PutMapping("/stocks/{id}/min-quantity")
        public ApiResponse<?> minQuantity(@PathVariable Long id,
                                          @RequestBody java.util.Map<String, Double> request,
                                          @AuthenticationPrincipal AuthenticatedUser user) {
            return stockRepository.findById(id).map(stock -> {
                InventoryBranchScope.requireSameBranch(stock.getBranchId(), user, "Stock does not belong to your branch");
                stock.setMinQuantity(request.getOrDefault("minQuantity", stock.getMinQuantity()));
                return ApiResponse.success(stockRepository.save(stock));
            }).orElseGet(() -> ApiResponse.error("Stock not found", null));
        }
    }
