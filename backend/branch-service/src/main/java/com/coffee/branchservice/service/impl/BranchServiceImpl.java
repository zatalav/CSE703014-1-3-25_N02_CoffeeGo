package com.coffee.branchservice.service.impl;

import com.coffee.branchservice.dto.request.BranchHoursRequest;
import com.coffee.branchservice.dto.request.BranchRequest;
import com.coffee.branchservice.dto.response.BranchHoursResponse;
import com.coffee.branchservice.dto.response.BranchResponse;
import com.coffee.branchservice.entity.Branch;
import com.coffee.branchservice.entity.BranchHours;
import com.coffee.branchservice.mapper.BranchHoursMapper;
import com.coffee.branchservice.mapper.BranchMapper;
import com.coffee.branchservice.repository.BranchHoursRepository;
import com.coffee.branchservice.repository.BranchRepository;
import com.coffee.branchservice.service.BranchService;
import com.coffee.common.exception.BadRequestException;
import com.coffee.common.exception.DuplicateResourceException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.common.response.PageResponse;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BranchServiceImpl implements BranchService {
    private final BranchRepository branchRepository;
    private final BranchHoursRepository branchHoursRepository;
    private final BranchMapper branchMapper;
    private final BranchHoursMapper branchHoursMapper;

    public BranchServiceImpl(
            BranchRepository branchRepository,
            BranchHoursRepository branchHoursRepository,
            BranchMapper branchMapper,
            BranchHoursMapper branchHoursMapper
    ) {
        this.branchRepository = branchRepository;
        this.branchHoursRepository = branchHoursRepository;
        this.branchMapper = branchMapper;
        this.branchHoursMapper = branchHoursMapper;
    }

    @Override
    public PageResponse<BranchResponse> list(String keyword, Map<String, String> filters, Pageable pageable) {
        Page<BranchResponse> page = branchRepository.findAll(buildSpec(keyword, filters), pageable)
                .map(branchMapper::toResponse);
        return PageResponse.from(page);
    }

    @Override
    public BranchResponse get(Long id) {
        return branchMapper.toResponse(findBranch(id));
    }

    @Override
    @Transactional
    public BranchResponse create(BranchRequest request) {
        validateBranchName(request.getBranchName(), null);
        Branch branch = branchMapper.toEntity(request);
        if (branch.getStatus() == null || branch.getStatus().isBlank()) {
            branch.setStatus("active");
        }
        return branchMapper.toResponse(branchRepository.save(branch));
    }

    @Override
    @Transactional
    public BranchResponse update(Long id, BranchRequest request) {
        Branch branch = findBranch(id);
        validateBranchName(request.getBranchName(), id);
        branchMapper.updateEntity(branch, request);
        if (branch.getStatus() == null || branch.getStatus().isBlank()) {
            branch.setStatus("active");
        }
        return branchMapper.toResponse(branchRepository.save(branch));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Branch branch = findBranch(id);
        branch.setStatus("inactive");
        branchRepository.save(branch);
    }

    @Override
    public List<BranchHoursResponse> getHours(Long branchId) {
        findBranch(branchId);
        return branchHoursRepository.findByBranchIdOrderByHoursIdAsc(branchId).stream()
                .map(branchHoursMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public List<BranchHoursResponse> updateHours(Long branchId, List<BranchHoursRequest> requests) {
        findBranch(branchId);
        if (requests == null) {
            throw new BadRequestException("Branch hours are required");
        }

        List<BranchHours> saved = new ArrayList<>();
        for (BranchHoursRequest request : requests) {
            validateHours(request);
            BranchHours entity = branchHoursRepository
                    .findByBranchIdAndDayOfWeek(branchId, request.getDayOfWeek())
                    .orElseGet(BranchHours::new);
            entity.setBranchId(branchId);
            entity.setDayOfWeek(request.getDayOfWeek());
            entity.setOpenTime(request.getOpenTime());
            entity.setCloseTime(request.getCloseTime());
            entity.setIsClosed(Boolean.TRUE.equals(request.getIsClosed()));
            saved.add(branchHoursRepository.save(entity));
        }
        return saved.stream().map(branchHoursMapper::toResponse).toList();
    }

    private Branch findBranch(Long id) {
        return branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + id));
    }

    private void validateBranchName(String branchName, Long currentId) {
        branchRepository.findByBranchName(branchName)
                .filter(branch -> currentId == null || !currentId.equals(branch.getBranchId()))
                .ifPresent(branch -> {
                    throw new DuplicateResourceException("Branch name already exists");
                });
    }

    private void validateHours(BranchHoursRequest request) {
        if (!Boolean.TRUE.equals(request.getIsClosed())) {
            if (request.getOpenTime() == null || request.getCloseTime() == null) {
                throw new BadRequestException("Open time and close time are required");
            }
            if (!request.getCloseTime().isAfter(request.getOpenTime())) {
                throw new BadRequestException("Closing time must be after opening time");
            }
        }
    }

    private Specification<Branch> buildSpec(String keyword, Map<String, String> filters) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("branchName")), like),
                        cb.like(cb.lower(root.get("address")), like),
                        cb.like(cb.lower(root.get("email")), like)
                ));
            }
            String status = filters.get("status");
            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            String branchType = filters.get("branchType");
            if (branchType != null && !branchType.isBlank() && !"all".equalsIgnoreCase(branchType)) {
                predicates.add(cb.equal(root.get("branchType"), branchType));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
