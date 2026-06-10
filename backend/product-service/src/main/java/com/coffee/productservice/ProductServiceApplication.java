package com.coffee.productservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.productservice"})
    public class ProductServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(ProductServiceApplication.class, args);
        }
    }
