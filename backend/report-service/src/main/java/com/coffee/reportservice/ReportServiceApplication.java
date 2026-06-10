package com.coffee.reportservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.reportservice"})
    public class ReportServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(ReportServiceApplication.class, args);
        }
    }
