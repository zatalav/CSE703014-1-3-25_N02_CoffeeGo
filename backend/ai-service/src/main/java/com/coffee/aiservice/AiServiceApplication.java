package com.coffee.aiservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.aiservice"})
    public class AiServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(AiServiceApplication.class, args);
        }
    }
