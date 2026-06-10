package com.coffee.branchservice.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import com.coffee.branchservice.dto.request.BranchHoursRequest;
    import com.coffee.branchservice.dto.response.BranchHoursResponse;
    import com.coffee.branchservice.dto.response.EmployeeResponse;
    import com.coffee.branchservice.entity.BranchHours;
    import com.coffee.branchservice.entity.Employee;
    import com.coffee.branchservice.mapper.BranchHoursMapper;
    import com.coffee.branchservice.mapper.EmployeeMapper;
    import com.coffee.branchservice.repository.BranchHoursRepository;
    import com.coffee.branchservice.repository.EmployeeRepository;
    import java.util.List;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PatchMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PutMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RequestParam;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/branches")
    @PreAuthorize("hasRole('admin')")
    public class BranchOperationsController {
        private final BranchHoursRepository hoursRepository;
        private final BranchHoursMapper hoursMapper;
        private final EmployeeRepository employeeRepository;
        private final EmployeeMapper employeeMapper;

        public BranchOperationsController(BranchHoursRepository hoursRepository, BranchHoursMapper hoursMapper,
                                          EmployeeRepository employeeRepository, EmployeeMapper employeeMapper) {
            this.hoursRepository = hoursRepository;
            this.hoursMapper = hoursMapper;
            this.employeeRepository = employeeRepository;
            this.employeeMapper = employeeMapper;
        }

        @GetMapping("/{branchId}/hours")
        public ApiResponse<List<BranchHoursResponse>> hours(@PathVariable Long branchId) {
            return ApiResponse.success(hoursRepository.findAll().stream()
                    .filter(item -> branchId.equals(item.getBranchId()))
                    .map(hoursMapper::toResponse)
                    .toList());
        }

        @PutMapping("/{branchId}/hours")
        public ApiResponse<List<BranchHoursResponse>> updateHours(@PathVariable Long branchId, @RequestBody List<BranchHoursRequest> requests) {
            List<BranchHours> saved = requests.stream().map(request -> {
                if (Boolean.FALSE.equals(request.getIsClosed()) && request.getOpenTime() != null && request.getCloseTime() != null
                        && !request.getCloseTime().isAfter(request.getOpenTime())) {
                    throw new BadRequestException("Closing time must be after opening time");
                }
                BranchHours entity = hoursMapper.toEntity(request);
                entity.setBranchId(branchId);
                return hoursRepository.save(entity);
            }).toList();
            return ApiResponse.success(saved.stream().map(hoursMapper::toResponse).toList());
        }

        @GetMapping("/{branchId}/employees")
        public ApiResponse<List<EmployeeResponse>> employees(@PathVariable Long branchId) {
            return ApiResponse.success(employeeRepository.findAll().stream()
                    .filter(item -> branchId.equals(item.getBranchId()))
                    .map(employeeMapper::toResponse)
                    .toList());
        }

        @PatchMapping("/{branchId}/assign-manager")
        public ApiResponse<EmployeeResponse> assignManager(@PathVariable Long branchId, @RequestParam Long employeeId) {
            return assign(branchId, employeeId);
        }

        @PatchMapping("/{branchId}/assign-employee")
        public ApiResponse<EmployeeResponse> assignEmployee(@PathVariable Long branchId, @RequestParam Long employeeId) {
            return assign(branchId, employeeId);
        }

        private ApiResponse<EmployeeResponse> assign(Long branchId, Long employeeId) {
            Employee employee = employeeRepository.findById(employeeId).orElseThrow(() -> new BadRequestException("Employee not found"));
            employee.setBranchId(branchId);
            return ApiResponse.success(employeeMapper.toResponse(employeeRepository.save(employee)));
        }
    }
