package com.coffee.inventoryservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.inventoryservice.dto.request.SupplierFormRequest;
import com.coffee.inventoryservice.dto.request.SupplierIngredientRequest;
import com.coffee.inventoryservice.dto.response.SupplierFormResponse;
import com.coffee.inventoryservice.entity.SupplierIngredient;
import com.coffee.inventoryservice.entity.SupplierIngredientId;
import com.coffee.inventoryservice.mapper.SupplierIngredientMapper;
import com.coffee.inventoryservice.repository.SupplierIngredientRepository;
import com.coffee.inventoryservice.service.SupplierPublicService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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

import java.util.HashMap;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {
    private final SupplierPublicService service;
    private final SupplierIngredientRepository supplierIngredientRepository;
    private final SupplierIngredientMapper supplierIngredientMapper;

    public SupplierController(SupplierPublicService service,
                              SupplierIngredientRepository supplierIngredientRepository,
                              SupplierIngredientMapper supplierIngredientMapper) {
        this.service = service;
        this.supplierIngredientRepository = supplierIngredientRepository;
        this.supplierIngredientMapper = supplierIngredientMapper;
    }

    @GetMapping
    public ApiResponse<PageResponse<SupplierFormResponse>> list(@RequestParam Map<String, String> params,
                                                                @PageableDefault(size = 100) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<SupplierFormResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PostMapping
    public ApiResponse<SupplierFormResponse> create(@Valid @RequestBody SupplierFormRequest request) {
        return ApiResponse.success("Created", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<SupplierFormResponse> update(@PathVariable Long id, @Valid @RequestBody SupplierFormRequest request) {
        return ApiResponse.success("Updated", service.update(id, request));
    }

    @PatchMapping("/{id}/active")
    public ApiResponse<SupplierFormResponse> active(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "active"));
    }

    @PatchMapping("/{id}/inactive")
    public ApiResponse<SupplierFormResponse> inactive(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "inactive"));
    }

    @PatchMapping("/{id}/hidden")
    public ApiResponse<SupplierFormResponse> hidden(@PathVariable Long id) {
        return ApiResponse.success("Status updated", service.setStatus(id, "hidden"));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.success("Deleted", null);
    }

    @GetMapping("/{id}/ingredients")
    public ApiResponse<List<?>> supplierIngredients(@PathVariable Long id) {
        return ApiResponse.success(supplierIngredientRepository.findAll().stream()
                .filter(item -> id.equals(item.getSupplierId()))
                .map(supplierIngredientMapper::toResponse)
                .toList());
    }

    @PostMapping("/{id}/ingredients")
    public ApiResponse<?> addSupplierIngredient(@PathVariable Long id, @RequestBody SupplierIngredientRequest request) {
        request.setSupplierId(id);
        SupplierIngredient entity = supplierIngredientMapper.toEntity(request);
        return ApiResponse.success(supplierIngredientMapper.toResponse(supplierIngredientRepository.save(entity)));
    }

    @DeleteMapping("/{id}/ingredients/{ingredientId}")
    public ApiResponse<Void> deleteSupplierIngredient(@PathVariable Long id, @PathVariable Long ingredientId) {
        SupplierIngredientId key = new SupplierIngredientId();
        key.setSupplierId(id);
        key.setIngredientId(ingredientId);
        supplierIngredientRepository.deleteById(key);
        return ApiResponse.success("Supplier ingredient removed", null);
    }
}
