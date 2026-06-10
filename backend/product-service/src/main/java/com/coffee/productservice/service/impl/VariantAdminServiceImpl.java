package com.coffee.productservice.service.impl;

import com.coffee.common.exception.DuplicateResourceException;
import com.coffee.common.service.CrudServiceSupport;
import com.coffee.productservice.dto.request.VariantRequest;
import com.coffee.productservice.dto.response.VariantResponse;
import com.coffee.productservice.entity.Variant;
import com.coffee.productservice.mapper.VariantMapper;
import com.coffee.productservice.repository.VariantRepository;
import com.coffee.productservice.service.VariantAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class VariantAdminServiceImpl extends CrudServiceSupport<Variant, Long, VariantRequest, VariantResponse> implements VariantAdminService {
    private final VariantRepository repository;
    private final VariantMapper mapper;

    public VariantAdminServiceImpl(VariantRepository repository, VariantMapper mapper) {
        super(repository, repository, mapper, Variant.class, "variant_id", List.of("variantGroup", "variantLabel"), Map.of("status", "status"), null);
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    public VariantResponse create(VariantRequest request) {
        normalize(request);
        return repository
                .findByVariantGroupIgnoreCaseAndVariantLabelIgnoreCase(request.getVariantGroup(), request.getVariantLabel())
                .map(mapper::toResponse)
                .orElseGet(() -> super.create(request));
    }

    @Override
    public VariantResponse update(Long id, VariantRequest request) {
        normalize(request);
        repository
                .findByVariantGroupIgnoreCaseAndVariantLabelIgnoreCase(request.getVariantGroup(), request.getVariantLabel())
                .filter(existing -> !existing.getVariantId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Variant already exists: " + request.getVariantGroup() + " - " + request.getVariantLabel());
                });
        return super.update(id, request);
    }

    private void normalize(VariantRequest request) {
        if (request == null) {
            return;
        }
        if (request.getVariantGroup() != null) {
            request.setVariantGroup(request.getVariantGroup().trim());
        }
        if (request.getVariantLabel() != null) {
            request.setVariantLabel(request.getVariantLabel().trim());
        }
        if (request.getStatus() == null || request.getStatus().isBlank()) {
            request.setStatus("active");
        } else {
            request.setStatus(request.getStatus().trim());
        }
    }
}
