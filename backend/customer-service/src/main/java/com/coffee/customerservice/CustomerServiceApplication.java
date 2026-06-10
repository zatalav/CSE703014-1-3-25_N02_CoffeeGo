package com.coffee.customerservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.customerservice"})
    public class CustomerServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(CustomerServiceApplication.class, args);
        }
    }
