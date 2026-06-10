package com.coffee.inventoryservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.inventoryservice"})
    public class InventoryServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(InventoryServiceApplication.class, args);
        }
    }
