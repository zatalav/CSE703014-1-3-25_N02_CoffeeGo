package com.coffee.authservice.config;

    import com.coffee.authservice.entity.Employee;
    import com.coffee.authservice.entity.EmployeeDetail;
    import com.coffee.authservice.entity.Role;
    import com.coffee.authservice.repository.EmployeeDetailRepository;
    import com.coffee.authservice.repository.EmployeeRepository;
    import com.coffee.authservice.repository.RoleRepository;
    import java.time.LocalDateTime;
    import org.springframework.boot.ApplicationArguments;
    import org.springframework.boot.ApplicationRunner;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.stereotype.Component;
    import org.springframework.transaction.annotation.Transactional;

    @Component
    public class AdminDataSeeder implements ApplicationRunner {
        private final RoleRepository roleRepository;
        private final EmployeeRepository employeeRepository;
        private final EmployeeDetailRepository detailRepository;
        private final PasswordEncoder passwordEncoder;
        private final String adminEmail;
        private final String adminPassword;

        public AdminDataSeeder(RoleRepository roleRepository, EmployeeRepository employeeRepository,
                               EmployeeDetailRepository detailRepository, PasswordEncoder passwordEncoder,
                               @Value("${app.seed.admin-email:admin@coffee.local}") String adminEmail,
                               @Value("${app.seed.admin-password:Admin}") String adminPassword) {
            this.roleRepository = roleRepository;
            this.employeeRepository = employeeRepository;
            this.detailRepository = detailRepository;
            this.passwordEncoder = passwordEncoder;
            this.adminEmail = adminEmail;
            this.adminPassword = adminPassword;
        }

        @Override
        @Transactional
        public void run(ApplicationArguments args) {
            Role adminRole = ensureRole("Admin", "admin", "system");
            ensureRole("Branch Manager", "manager", "sales");
            ensureRole("Warehouse Manager", "manager", "warehouse");
            ensureRole("Branch Staff", "employee", "sales");
            ensureRole("Warehouse Staff", "employee", "warehouse");
            ensureRole("Delivery Staff", "employee", "sales");
            EmployeeDetail existingDetail = detailRepository.findByEmail(adminEmail).orElse(null);
            if (existingDetail != null) {
                employeeRepository.findById(existingDetail.getEmployeeId()).ifPresent(employee -> {
                    employee.setName("System Admin");
                    employee.setRoleId(adminRole.getRoleId());
                    employee.setBranchId(null);
                    employee.setStatus("active");
                    employeeRepository.save(employee);
                });
                if (existingDetail.getPassword() == null || !passwordEncoder.matches(adminPassword, existingDetail.getPassword())) {
                    existingDetail.setPassword(passwordEncoder.encode(adminPassword));
                    detailRepository.save(existingDetail);
                }
                return;
            }
            Employee employee = new Employee();
            employee.setName("System Admin");
            employee.setRoleId(adminRole.getRoleId());
            employee.setStatus("active");
            employee = employeeRepository.save(employee);

            EmployeeDetail detail = new EmployeeDetail();
            detail.setEmployeeId(employee.getId());
            detail.setEmail(adminEmail);
            detail.setPhoneNumber("0900000000");
            detail.setPassword(passwordEncoder.encode(adminPassword));
            detail.setGender("other");
            detail.setCreatedAt(LocalDateTime.now());
            detailRepository.save(detail);
        }

        private Role ensureRole(String roleName, String roleGroup, String department) {
            return roleRepository.findAll().stream()
                    .filter(role -> role.getRoleName() != null && role.getRoleName().equalsIgnoreCase(roleName))
                    .findFirst()
                    .orElseGet(() -> {
                        Role role = new Role();
                        role.setRoleName(roleName);
                        role.setRoleGroup(roleGroup);
                        role.setDepartment(department);
                        role.setStatus("active");
                        return roleRepository.save(role);
                    });
        }
    }
