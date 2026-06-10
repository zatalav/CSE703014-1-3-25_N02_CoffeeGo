package com.coffee.notificationservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.notificationservice"})
    public class NotificationServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(NotificationServiceApplication.class, args);
        }
    }
