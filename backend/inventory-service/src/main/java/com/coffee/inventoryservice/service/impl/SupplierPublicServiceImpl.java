package com.coffee.inventoryservice.service.impl;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.common.response.PageResponse;
import com.coffee.inventoryservice.dto.request.SupplierFormRequest;
import com.coffee.inventoryservice.dto.response.SupplierFormResponse;
import com.coffee.inventoryservice.entity.Supplier;
import com.coffee.inventoryservice.entity.SupplierDetail;
import com.coffee.inventoryservice.repository.SupplierDetailRepository;
import com.coffee.inventoryservice.repository.SupplierRepository;
import com.coffee.inventoryservice.service.SupplierPublicService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class SupplierPublicServiceImpl implements SupplierPublicService {
    private final SupplierRepository supplierRepository;
    private final SupplierDetailRepository detailRepository;
    private final ObjectMapper objectMapper;

    public SupplierPublicServiceImpl(SupplierRepository supplierRepository,
                                     SupplierDetailRepository detailRepository,
                                     ObjectMapper objectMapper) {
        this.supplierRepository = supplierRepository;
        this.detailRepository = detailRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public PageResponse<SupplierFormResponse> list(String keyword, Map<String, String> filters, Pageable pageable) {
        Page<Supplier> page = supplierRepository.findAll(specification(keyword, filters), pageable);
        List<SupplierFormResponse> items = page.getContent().stream().map(this::toResponse).toList();
        return new PageResponse<>(items, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    public SupplierFormResponse get(Long id) {
        return toResponse(findSupplier(id));
    }

    @Override
    @Transactional
    public SupplierFormResponse create(SupplierFormRequest request) {
        Supplier supplier = new Supplier();
        applySupplier(supplier, request);
        Supplier saved = supplierRepository.save(supplier);
        saveDetail(saved.getSupplierId(), request);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SupplierFormResponse update(Long id, SupplierFormRequest request) {
        Supplier supplier = findSupplier(id);
        applySupplier(supplier, request);
        Supplier saved = supplierRepository.save(supplier);
        saveDetail(id, request);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SupplierFormResponse setStatus(Long id, String status) {
        Supplier supplier = findSupplier(id);
        supplier.setStatus(normalizeStatus(status));
        return toResponse(supplierRepository.save(supplier));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new ResourceNotFoundException("Supplier not found");
        }
        detailRepository.deleteById(id);
        supplierRepository.deleteById(id);
    }

    private Supplier findSupplier(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));
    }

    private void applySupplier(Supplier supplier, SupplierFormRequest request) {
        supplier.setSupplierName(request.getSupplierName());
        supplier.setAddress(request.getAddress());
        supplier.setStatus(normalizeStatus(request.getStatus()));
        supplier.setUrlImg(request.getUrlImg());
        supplier.setDescription(writeMeta(request));
    }

    private void saveDetail(Long supplierId, SupplierFormRequest request) {
        SupplierDetail detail = detailRepository.findById(supplierId).orElseGet(SupplierDetail::new);
        detail.setSupplierId(supplierId);
        detail.setContactPerson(blankToDefault(request.getContactPerson(), ""));
        detail.setPhone(blankToDefault(request.getPhone(), ""));
        detail.setEmail(blankToDefault(request.getEmail(), ""));
        detail.setDeliveryTime(request.getDeliveryTime() == null ? 0 : request.getDeliveryTime());
        detailRepository.save(detail);
    }

    private SupplierFormResponse toResponse(Supplier supplier) {
        SupplierMeta meta = readMeta(supplier.getDescription());
        SupplierDetail detail = detailRepository.findById(supplier.getSupplierId()).orElse(null);
        SupplierFormResponse response = new SupplierFormResponse();
        response.setSupplierId(supplier.getSupplierId());
        response.setSupplierName(supplier.getSupplierName());
        response.setAddress(supplier.getAddress());
        response.setStatus(supplier.getStatus());
        response.setUrlImg(supplier.getUrlImg());
        response.setNote(meta.note);
        response.setMoqValue(meta.moqValue);
        response.setMoqUnit(meta.moqUnit);
        if (detail != null) {
            response.setContactPerson(detail.getContactPerson());
            response.setPhone(detail.getPhone());
            response.setEmail(detail.getEmail());
            response.setDeliveryTime(detail.getDeliveryTime());
        }
        return response;
    }

    private Specification<Supplier> specification(String keyword, Map<String, String> filters) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
            if (!normalizedKeyword.isBlank()) {
                String value = "%" + normalizedKeyword + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("supplierName")), value),
                        builder.like(builder.lower(root.get("address")), value),
                        builder.like(builder.lower(root.get("description")), value)
                ));
            }
            String status = filters == null ? null : filters.get("status");
            if (status != null && !status.isBlank()) {
                predicates.add(builder.equal(root.get("status"), status));
            }
            return predicates.isEmpty() ? builder.conjunction() : builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private String writeMeta(SupplierFormRequest request) {
        SupplierMeta meta = new SupplierMeta();
        meta.note = request.getNote();
        meta.moqValue = request.getMoqValue();
        meta.moqUnit = request.getMoqUnit();
        try {
            return objectMapper.writeValueAsString(meta);
        } catch (JsonProcessingException ex) {
            return request.getNote();
        }
    }

    private SupplierMeta readMeta(String value) {
        if (value == null || value.isBlank()) {
            return new SupplierMeta();
        }
        try {
            return objectMapper.readValue(value, SupplierMeta.class);
        } catch (Exception ex) {
            SupplierMeta meta = new SupplierMeta();
            meta.note = value;
            return meta;
        }
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalizeStatus(String status) {
        String normalized = blankToDefault(status, "active").trim().toLowerCase();
        if ("hidden".equals(normalized)) {
            return "inactive";
        }
        return normalized;
    }

    public static class SupplierMeta {
        public String note;
        public Double moqValue;
        public String moqUnit;
    }
}
