package com.coffee.authservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.authservice"})
    public class AuthServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(AuthServiceApplication.class, args);
        }
    }
