package com.coffee.branchservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.branchservice"})
    public class BranchServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(BranchServiceApplication.class, args);
        }
    }
