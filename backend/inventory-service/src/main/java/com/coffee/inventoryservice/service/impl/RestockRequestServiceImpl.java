package com.coffee.inventoryservice.service.impl;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.common.response.PageResponse;
import com.coffee.inventoryservice.dto.request.RestockRequestCreateRequest;
import com.coffee.inventoryservice.dto.request.RestockRequestItemRequest;
import com.coffee.inventoryservice.dto.response.RestockRequestDetailResponse;
import com.coffee.inventoryservice.dto.response.RestockRequestResponse;
import com.coffee.inventoryservice.entity.Ingredient;
import com.coffee.inventoryservice.entity.RestockRequest;
import com.coffee.inventoryservice.entity.RestockRequestDetail;
import com.coffee.inventoryservice.repository.BranchRepository;
import com.coffee.inventoryservice.repository.IngredientRepository;
import com.coffee.inventoryservice.repository.RestockRequestDetailRepository;
import com.coffee.inventoryservice.repository.RestockRequestRepository;
import com.coffee.inventoryservice.service.RestockRequestService;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestockRequestServiceImpl implements RestockRequestService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("pending", "processing", "fulfilled", "cancelled");

    private final RestockRequestRepository repository;
    private final RestockRequestDetailRepository detailRepository;
    private final BranchRepository branchRepository;
    private final IngredientRepository ingredientRepository;

    public RestockRequestServiceImpl(
            RestockRequestRepository repository,
            RestockRequestDetailRepository detailRepository,
            BranchRepository branchRepository,
            IngredientRepository ingredientRepository
    ) {
        this.repository = repository;
        this.detailRepository = detailRepository;
        this.branchRepository = branchRepository;
        this.ingredientRepository = ingredientRepository;
    }

    @Override
    public PageResponse<RestockRequestResponse> list(String keyword, Map<String, String> filters, Pageable pageable) {
        Page<RestockRequestResponse> page = repository.findAll(buildSpec(keyword, filters), pageable)
                .map(this::toResponse);
        return PageResponse.from(page);
    }

    @Override
    public RestockRequestResponse get(Long id) {
        return toResponse(find(id));
    }

    @Override
    @Transactional
    public RestockRequestResponse create(RestockRequestCreateRequest request) {
        validateCreateRequest(request);
        LocalDateTime now = LocalDateTime.now();

        RestockRequest entity = new RestockRequest();
        entity.setBranchId(request.getBranchId());
        entity.setEmployeeId(request.getEmployeeId());
        entity.setNote(request.getNote());
        entity.setStatus("pending");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        RestockRequest saved = repository.save(entity);
        for (RestockRequestItemRequest item : request.getItems()) {
            Ingredient ingredient = ingredientRepository.findById(item.getIngredientId())
                    .orElseThrow(() -> new BadRequestException("Invalid ingredient in restock request"));
            RestockRequestDetail detail = new RestockRequestDetail();
            detail.setRequestId(saved.getRequestId());
            detail.setIngredientId(item.getIngredientId());
            detail.setQuantity(item.getQuantity());
            detail.setUnit(valueOr(item.getUnit(), ingredient.getUnit()));
            detail.setCurrentQuantity(item.getCurrentQuantity());
            detail.setMinQuantity(item.getMinQuantity());
            detailRepository.save(detail);
        }

        return toResponse(saved);
    }

    @Override
    @Transactional
    public RestockRequestResponse updateStatus(Long id, String status) {
        String normalizedStatus = normalizeStatus(status);
        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Invalid restock request status");
        }
        RestockRequest entity = find(id);
        entity.setStatus(normalizedStatus);
        entity.setUpdatedAt(LocalDateTime.now());
        return toResponse(repository.save(entity));
    }

    private Specification<RestockRequest> buildSpec(String keyword, Map<String, String> filters) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            String branchId = filters.get("branchId");
            if (branchId != null && !branchId.isBlank() && !"all".equalsIgnoreCase(branchId)) {
                predicates.add(cb.equal(root.get("branchId"), Long.valueOf(branchId)));
            }
            String status = filters.get("status");
            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(cb.lower(root.get("status").as(String.class)), normalizeStatus(status)));
            }
            if (keyword != null && !keyword.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("note").as(String.class)), "%" + keyword.toLowerCase(Locale.ROOT) + "%"));
            }
            String fromDate = filters.get("fromDate");
            if (fromDate != null && !fromDate.isBlank()) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), LocalDate.parse(fromDate).atStartOfDay()));
            }
            String toDate = filters.get("toDate");
            if (toDate != null && !toDate.isBlank()) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), LocalDate.parse(toDate).atTime(LocalTime.MAX)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private void validateCreateRequest(RestockRequestCreateRequest request) {
        if (request.getBranchId() == null || !branchRepository.existsById(request.getBranchId())) {
            throw new BadRequestException("Invalid branch in restock request");
        }
        if (request.getEmployeeId() == null) {
            throw new BadRequestException("Invalid creator in restock request");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Restock request must contain at least one item");
        }
        for (RestockRequestItemRequest item : request.getItems()) {
            if (item.getIngredientId() == null || !ingredientRepository.existsById(item.getIngredientId())) {
                throw new BadRequestException("Invalid ingredient in restock request");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new BadRequestException("Restock quantity must be greater than 0");
            }
        }
    }

    private RestockRequest find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Restock request not found: request_id=" + id));
    }

    private RestockRequestResponse toResponse(RestockRequest entity) {
        RestockRequestResponse response = new RestockRequestResponse();
        response.setRequestId(entity.getRequestId());
        response.setBranchId(entity.getBranchId());
        response.setEmployeeId(entity.getEmployeeId());
        response.setStatus(entity.getStatus());
        response.setNote(entity.getNote());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        response.setItems(detailRepository.findByRequestIdOrderByRequestDetailIdAsc(entity.getRequestId()).stream()
                .map(this::toDetailResponse)
                .toList());
        return response;
    }

    private RestockRequestDetailResponse toDetailResponse(RestockRequestDetail entity) {
        RestockRequestDetailResponse response = new RestockRequestDetailResponse();
        response.setRequestDetailId(entity.getRequestDetailId());
        response.setRequestId(entity.getRequestId());
        response.setIngredientId(entity.getIngredientId());
        response.setQuantity(entity.getQuantity());
        response.setUnit(entity.getUnit());
        response.setCurrentQuantity(entity.getCurrentQuantity());
        response.setMinQuantity(entity.getMinQuantity());
        return response;
    }

    private String normalizeStatus(String status) {
        return (status == null ? "" : status.trim().toLowerCase(Locale.ROOT));
    }

    private String valueOr(String value, String fallback) {
        if (value != null && !value.isBlank()) {
            return value;
        }
        return fallback == null || fallback.isBlank() ? "unit" : fallback;
    }
}
