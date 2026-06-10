package com.coffee.userservice.service.impl;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.service.CrudServiceSupport;
import com.coffee.userservice.dto.request.EmployeeRequest;
import com.coffee.userservice.dto.response.EmployeeResponse;
import com.coffee.userservice.entity.Employee;
import com.coffee.userservice.entity.EmployeeDetail;
import com.coffee.userservice.entity.Role;
import com.coffee.userservice.mapper.EmployeeMapper;
import com.coffee.userservice.repository.EmployeeDetailRepository;
import com.coffee.userservice.repository.EmployeeRepository;
import com.coffee.userservice.repository.RoleRepository;
import com.coffee.userservice.service.AccountEmailService;
import com.coffee.userservice.service.ManagerAdminService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ManagerAdminServiceImpl extends CrudServiceSupport<Employee, Long, EmployeeRequest, EmployeeResponse> implements ManagerAdminService {
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
    private static final int TEMPORARY_PASSWORD_LENGTH = 12;

    private final EmployeeRepository repository;
    private final EmployeeDetailRepository detailRepository;
    private final EmployeeMapper mapper;
    private final PasswordEncoder passwordEncoder;
    private final AccountEmailService accountEmailService;
    private final RoleRepository roleRepository;
    private final JdbcTemplate jdbcTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public ManagerAdminServiceImpl(EmployeeRepository repository, EmployeeMapper mapper, EmployeeDetailRepository detailRepository,
                                   PasswordEncoder passwordEncoder, AccountEmailService accountEmailService, RoleRepository roleRepository,
                                   JdbcTemplate jdbcTemplate) {
        super(repository, repository, mapper, Employee.class, "id", List.of("name"), Map.of("roleId", "roleId", "branchId", "branchId", "status", "status"), null);
        this.repository = repository;
        this.mapper = mapper;
        this.detailRepository = detailRepository;
        this.passwordEncoder = passwordEncoder;
        this.accountEmailService = accountEmailService;
        this.roleRepository = roleRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public EmployeeResponse create(EmployeeRequest request) {
        validateEmailAvailable(request.getEmail(), null);
        Employee saved = repository.save(mapper.toEntity(request));
        String temporaryPassword = generateTemporaryPassword();
        saveDetail(saved.getId(), request, temporaryPassword);
        sendTemporaryPassword(saved, request, temporaryPassword);
        return mapper.toResponse(saved);
    }

    @Override
    public EmployeeResponse update(Long id, EmployeeRequest request) {
        validateEmailAvailable(request.getEmail(), id);
        Employee employee = find(id);
        mapper.updateEntity(employee, request);
        Employee saved = repository.save(employee);
        saveDetail(saved.getId(), request, null);
        return mapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Employee employee = find(id);
        jdbcTemplate.update("delete from refresh_token where employee_id = ?", id);
        detailRepository.deleteById(id);
        repository.delete(employee);
    }

    private void saveDetail(Long employeeId, EmployeeRequest request, String temporaryPassword) {
        EmployeeDetail detail = detailRepository.findById(employeeId).orElseGet(EmployeeDetail::new);
        detail.setEmployeeId(employeeId);
        detail.setEmail(blankToNull(request.getEmail()));
        detail.setPhoneNumber(blankToNull(request.getPhoneNumber()));
        detail.setImgUrl(blankToNull(request.getImgUrl()));
        if (temporaryPassword != null) {
            detail.setPassword(passwordEncoder.encode(temporaryPassword));
        }
        if (detail.getCreatedAt() == null) {
            detail.setCreatedAt(request.getCreatedAt() != null ? request.getCreatedAt() : LocalDateTime.now());
        }
        detailRepository.save(detail);
    }

    private void sendTemporaryPassword(Employee employee, EmployeeRequest request, String temporaryPassword) {
        Role role = roleRepository.findById(employee.getRoleId()).orElse(null);
        String roleName = role == null ? null : role.getRoleName();
        accountEmailService.sendTemporaryPassword(request.getEmail(), employee.getName(), roleName, temporaryPassword);
    }

    private void validateEmailAvailable(String email, Long employeeId) {
        String normalizedEmail = blankToNull(email);
        if (normalizedEmail == null) {
            return;
        }
        detailRepository.findByEmail(normalizedEmail)
                .filter(detail -> employeeId == null || !employeeId.equals(detail.getEmployeeId()))
                .ifPresent(detail -> {
                    throw new BadRequestException("Email is already used by another employee");
                });
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(TEMPORARY_PASSWORD_LENGTH);
        for (int i = 0; i < TEMPORARY_PASSWORD_LENGTH; i++) {
            password.append(PASSWORD_CHARS.charAt(secureRandom.nextInt(PASSWORD_CHARS.length())));
        }
        return password.toString();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
