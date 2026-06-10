package com.coffee.promotionservice;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {"com.coffee.common", "com.coffee.promotionservice"})
    public class PromotionServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(PromotionServiceApplication.class, args);
        }
    }
