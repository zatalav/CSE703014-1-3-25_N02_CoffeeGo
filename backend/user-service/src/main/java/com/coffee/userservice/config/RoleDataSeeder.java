package com.coffee.userservice.config;

import com.coffee.userservice.entity.Role;
import com.coffee.userservice.repository.RoleRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class RoleDataSeeder implements ApplicationRunner {
    private final RoleRepository roleRepository;

    public RoleDataSeeder(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureRole("Sale Staff", "employee", "sales");
        ensureRole("Warehouse Staff", "employee", "warehouse");
        ensureRole("Delivery Staff", "employee", "sales");
    }

    private void ensureRole(String roleName, String roleGroup, String department) {
        boolean exists = roleRepository.findAll().stream()
                .anyMatch(role -> role.getRoleName() != null && role.getRoleName().equalsIgnoreCase(roleName));
        if (exists) {
            return;
        }
        Role role = new Role();
        role.setRoleName(roleName);
        role.setRoleGroup(roleGroup);
        role.setDepartment(department);
        role.setStatus("active");
        roleRepository.save(role);
    }
}
