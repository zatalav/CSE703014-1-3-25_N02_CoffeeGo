package com.coffee.userservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.userservice.dto.response.EmployeeLookupResponse;
import com.coffee.userservice.dto.response.LookupOptionResponse;
import com.coffee.userservice.entity.Employee;
import com.coffee.userservice.entity.Role;
import com.coffee.userservice.repository.BranchRepository;
import com.coffee.userservice.repository.EmployeeRepository;
import com.coffee.userservice.repository.MembershipRankRepository;
import com.coffee.userservice.repository.RoleRepository;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lookups")
public class LookupController {
    private final BranchRepository branchRepository;
    private final RoleRepository roleRepository;
    private final EmployeeRepository employeeRepository;
    private final MembershipRankRepository membershipRankRepository;

    public LookupController(BranchRepository branchRepository,
                            RoleRepository roleRepository,
                            EmployeeRepository employeeRepository,
                            MembershipRankRepository membershipRankRepository) {
        this.branchRepository = branchRepository;
        this.roleRepository = roleRepository;
        this.employeeRepository = employeeRepository;
        this.membershipRankRepository = membershipRankRepository;
    }

    @GetMapping("/branches")
    public ApiResponse<List<LookupOptionResponse>> branches() {
        return ApiResponse.success(branchRepository.findAll().stream()
                .map(branch -> new LookupOptionResponse(branch.getBranchId(), branch.getBranchName(), branch.getBranchType(), branch.getStatus()))
                .toList());
    }

    @GetMapping("/roles")
    public ApiResponse<List<LookupOptionResponse>> roles(@RequestParam(defaultValue = "all") String scope) {
        Predicate<Role> filter = switch (scope) {
            case "employee" -> this::isEmployeeRole;
            case "manager" -> this::isManagerRole;
            default -> role -> true;
        };
        return ApiResponse.success(roleRepository.findAll().stream()
                .filter(filter)
                .map(role -> new LookupOptionResponse(role.getRoleId(), role.getRoleName(), role.getRoleGroup(), role.getStatus()))
                .toList());
    }

    @GetMapping("/employees")
    public ApiResponse<List<EmployeeLookupResponse>> employees(@RequestParam(defaultValue = "employee") String scope,
                                                               @RequestParam(required = false) Long branchId,
                                                               @AuthenticationPrincipal AuthenticatedUser user) {
        Long effectiveBranchId = isBranchManager(user) ? user.getBranchId() : branchId;
        Map<Long, Role> roles = roleRepository.findAll().stream()
                .collect(Collectors.toMap(Role::getRoleId, role -> role));
        Predicate<Employee> filter = switch (scope) {
            case "manager" -> employee -> {
                Role role = roles.get(employee.getRoleId());
                return role != null && isManagerRole(role);
            };
            default -> employee -> {
                Role role = roles.get(employee.getRoleId());
                return role != null && isEmployeeRole(role);
            };
        };

        return ApiResponse.success(employeeRepository.findAll().stream()
                .filter(employee -> effectiveBranchId == null || effectiveBranchId.equals(employee.getBranchId()))
                .filter(filter)
                .map(employee -> {
                    Role role = roles.get(employee.getRoleId());
                    return new EmployeeLookupResponse(
                            employee.getId(),
                            employee.getName(),
                            employee.getBranchId(),
                            employee.getRoleId(),
                            role == null ? null : role.getRoleName(),
                            employee.getStatus()
                    );
                })
                .toList());
    }

    @GetMapping("/membership-ranks")
    public ApiResponse<List<LookupOptionResponse>> membershipRanks() {
        return ApiResponse.success(membershipRankRepository.findAll().stream()
                .map(rank -> new LookupOptionResponse(rank.getRankId(), rank.getRankName(), null, rank.getStatus()))
                .toList());
    }

    private boolean isEmployeeRole(Role role) {
        if (role == null) {
            return false;
        }
        String group = normalize(role.getRoleGroup());
        if (group.equals("employee") || group.equals("staff") || group.contains("nhan vien")) {
            return true;
        }
        return isEmployeeRoleName(role.getRoleName());
    }

    private boolean isEmployeeRoleName(String roleName) {
        String value = normalize(roleName);
        if (value.contains("admin") || value.contains("manager") || value.contains("quan ly")) {
            return false;
        }
        return value.equals("sale staff")
                || value.equals("sales staff")
                || value.equals("branch staff")
                || value.equals("warehouse staff")
                || value.equals("delivery staff")
                || value.equals("shipper")
                || value.contains("staff")
                || value.contains("nhan vien")
                || value.contains("pha che")
                || value.contains("thu ngan")
                || value.contains("phuc vu")
                || value.contains("ban hang")
                || value.contains("kho")
                || value.equals("nhan vien van chuyen")
                || value.equals("nhan vien giao hang");
    }

    private boolean isManagerRole(Role role) {
        if (role == null) {
            return false;
        }
        String group = normalize(role.getRoleGroup());
        String value = normalize(role.getRoleName());
        return value.equals("sale manager")
                || value.equals("sales manager")
                || value.equals("branch manager")
                || value.equals("warehouse manager")
                || group.equals("manager")
                || group.contains("quan ly");
    }

    private boolean isBranchManager(AuthenticatedUser user) {
        String role = normalize(user == null ? null : user.getRoleName());
        return "branch_manager".equals(role)
                || "branch manager".equals(role)
                || role.contains("quan ly chi nhanh")
                || role.contains("quan ly ban hang")
                || role.contains("sales manager")
                || role.contains("sale manager");
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toLowerCase(Locale.ROOT).replace('_', ' ').trim();
    }
}
