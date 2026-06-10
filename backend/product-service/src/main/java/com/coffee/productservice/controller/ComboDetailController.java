package com.coffee.productservice.controller;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.common.response.ApiResponse;
import com.coffee.productservice.dto.request.ComboDetailRequest;
import com.coffee.productservice.dto.response.ComboDetailResponse;
import com.coffee.productservice.entity.ComboDetail;
import com.coffee.productservice.entity.ComboDetailId;
import com.coffee.productservice.mapper.ComboDetailMapper;
import com.coffee.productservice.repository.ComboDetailRepository;
import com.coffee.productservice.repository.ComboRepository;
import com.coffee.productservice.repository.ProductRepository;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/products/combos")
public class ComboDetailController {
    private final ComboDetailRepository comboDetailRepository;
    private final ComboRepository comboRepository;
    private final ProductRepository productRepository;
    private final ComboDetailMapper mapper;

    public ComboDetailController(ComboDetailRepository comboDetailRepository,
                                 ComboRepository comboRepository,
                                 ProductRepository productRepository,
                                 ComboDetailMapper mapper) {
        this.comboDetailRepository = comboDetailRepository;
        this.comboRepository = comboRepository;
        this.productRepository = productRepository;
        this.mapper = mapper;
    }

    @GetMapping("/details")
    public ApiResponse<?> listAll() {
        return ApiResponse.success(comboDetailRepository.findAll().stream()
                .map(mapper::toResponse)
                .toList());
    }

    @GetMapping("/{comboId}/details")
    public ApiResponse<?> listByCombo(@PathVariable Long comboId) {
        assertComboExists(comboId);
        return ApiResponse.success(comboDetailRepository.findAll().stream()
                .filter(item -> comboId.equals(item.getComboId()))
                .map(mapper::toResponse)
                .toList());
    }

    @PostMapping("/{comboId}/details")
    public ApiResponse<ComboDetailResponse> create(@PathVariable Long comboId,
                                                   @Valid @RequestBody ComboDetailRequest request) {
        request.setComboId(comboId);
        assertComboExists(comboId);
        assertProductExists(request.getProductId());
        ComboDetail entity = mapper.toEntity(request);
        return ApiResponse.success("Created", mapper.toResponse(comboDetailRepository.save(entity)));
    }

    @PutMapping("/{comboId}/details/{productId}")
    public ApiResponse<ComboDetailResponse> update(@PathVariable Long comboId,
                                                   @PathVariable Long productId,
                                                   @Valid @RequestBody ComboDetailRequest request) {
        assertComboExists(comboId);
        assertProductExists(productId);
        ComboDetailId id = id(comboId, productId);
        ComboDetail entity = comboDetailRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Combo detail not found"));
        request.setComboId(comboId);
        request.setProductId(productId);
        mapper.updateEntity(entity, request);
        return ApiResponse.success("Updated", mapper.toResponse(comboDetailRepository.save(entity)));
    }

    @DeleteMapping("/{comboId}/details/{productId}")
    public ApiResponse<Void> delete(@PathVariable Long comboId, @PathVariable Long productId) {
        comboDetailRepository.deleteById(id(comboId, productId));
        return ApiResponse.success("Deleted", null);
    }

    private void assertComboExists(Long comboId) {
        if (!comboRepository.existsById(comboId)) {
            throw new ResourceNotFoundException("Combo not found");
        }
    }

    private void assertProductExists(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found");
        }
    }

    private ComboDetailId id(Long comboId, Long productId) {
        ComboDetailId id = new ComboDetailId();
        id.setComboId(comboId);
        id.setProductId(productId);
        return id;
    }
}
