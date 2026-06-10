package com.coffee.branchservice.service.impl;

import com.coffee.branchservice.dto.request.WorkScheduleRequest;
import com.coffee.branchservice.dto.response.WorkScheduleResponse;
import com.coffee.branchservice.entity.Employee;
import com.coffee.common.service.CrudServiceSupport;
import com.coffee.branchservice.entity.WorkSchedule;
import com.coffee.branchservice.mapper.WorkScheduleMapper;
import com.coffee.branchservice.repository.BranchRepository;
import com.coffee.branchservice.repository.EmployeeRepository;
import com.coffee.branchservice.repository.WorkScheduleRepository;
import com.coffee.branchservice.service.WorkScheduleAdminService;
import com.coffee.common.exception.BadRequestException;
import com.coffee.common.exception.ResourceNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class WorkScheduleAdminServiceImpl extends CrudServiceSupport<WorkSchedule, Long, WorkScheduleRequest, WorkScheduleResponse> implements WorkScheduleAdminService {
    private final WorkScheduleRepository repository;
    private final EmployeeRepository employeeRepository;
    private final BranchRepository branchRepository;
    private final WorkScheduleMapper mapper;

    public WorkScheduleAdminServiceImpl(WorkScheduleRepository repository,
                                        WorkScheduleMapper mapper,
                                        EmployeeRepository employeeRepository,
                                        BranchRepository branchRepository) {
        super(repository, repository, mapper, WorkSchedule.class, "schedule_id", List.of("note"), Map.of("branchId", "branchId", "employeeId", "employeeId", "status", "status"), "workDate");
        this.repository = repository;
        this.employeeRepository = employeeRepository;
        this.branchRepository = branchRepository;
        this.mapper = mapper;
    }

    @Override
    public WorkScheduleResponse create(WorkScheduleRequest request) {
        validateBranchEmployee(request);
        if (request.getCreatedAt() == null) {
            request.setCreatedAt(LocalDateTime.now());
        }
        return super.create(request);
    }

    @Override
    public WorkScheduleResponse update(Long id, WorkScheduleRequest request) {
        validateBranchEmployee(request);
        WorkSchedule entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkSchedule not found: schedule_id=" + id));
        if (request.getCreatedAt() == null) {
            request.setCreatedAt(entity.getCreatedAt() == null ? LocalDateTime.now() : entity.getCreatedAt());
        }
        mapper.updateEntity(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    @Override
    public void delete(Long id) {
        WorkSchedule entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkSchedule not found: schedule_id=" + id));
        repository.delete(entity);
    }

    private void validateBranchEmployee(WorkScheduleRequest request) {
        if (request == null || request.getBranchId() == null || request.getEmployeeId() == null) {
            throw new BadRequestException("branchId and employeeId are required");
        }
        if (!branchRepository.existsById(request.getBranchId())) {
            throw new BadRequestException("Branch not found");
        }

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new BadRequestException("Employee not found"));
        if (employee.getBranchId() == null || !employee.getBranchId().equals(request.getBranchId())) {
            throw new BadRequestException("Employee does not belong to the selected branch");
        }
        String status = employee.getStatus() == null ? "active" : employee.getStatus().toLowerCase(Locale.ROOT);
        if ("inactive".equals(status) || "locked".equals(status)) {
            throw new BadRequestException("Employee is not active");
        }
    }
}
