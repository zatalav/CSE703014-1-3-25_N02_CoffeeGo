package com.coffee.contentservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.contentservice"})
    public class ContentServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(ContentServiceApplication.class, args);
        }
    }
