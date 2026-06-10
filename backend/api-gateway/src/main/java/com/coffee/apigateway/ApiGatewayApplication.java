package com.coffee.apigateway;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.apigateway"})
    public class ApiGatewayApplication {
        public static void main(String[] args) {
            SpringApplication.run(ApiGatewayApplication.class, args);
        }
    }
