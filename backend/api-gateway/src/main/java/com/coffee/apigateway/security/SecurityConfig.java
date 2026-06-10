package com.coffee.apigateway.security;

    import com.coffee.common.security.JwtAuthenticationFilter;
    import org.springframework.context.annotation.Bean;
    import org.springframework.context.annotation.Configuration;
    import org.springframework.http.HttpMethod;
    import org.springframework.security.config.annotation.web.builders.HttpSecurity;
    import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
    import org.springframework.security.config.http.SessionCreationPolicy;
    import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.security.web.SecurityFilterChain;
    import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

    @Configuration
    @EnableWebSecurity
    public class SecurityConfig {
        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
            http.csrf(csrf -> csrf.disable())
                    .cors(cors -> {})
                    .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                    .authorizeHttpRequests(auth -> auth
                            .requestMatchers("/", "/payment-return", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/actuator/health",
                                    "/api/auth/login", "/api/auth/register", "/api/auth/customer/register",
                                    "/api/auth/customer/google", "/api/auth/forgot-password", "/api/auth/verify-otp",
                                    "/api/auth/reset-password", "/api/auth/refresh-token").permitAll()
                            .requestMatchers("/api/products/**", "/api/product-categories/**", "/api/branches/**",
                                    "/api/content/**", "/api/upload/**",
                                    "/api/ai/customer/**",
                                    "/api/orders/customer", "/api/orders/customer/**",
                                    "/api/payments/sandbox", "/api/payments/sandbox/**").permitAll()
                            .requestMatchers(HttpMethod.GET, "/api/customers/membership-ranks", "/api/customers/membership-ranks/**",
                                    "/api/customers/drips-vouchers", "/api/customers/drips-vouchers/**",
                                    "/api/promotions/coupons", "/api/promotions/coupons/**").permitAll()
                            .requestMatchers("/api/admin/inventory/**").hasAnyRole("admin", "warehouse_manager", "branch_manager")
                            .requestMatchers("/api/admin/branches/**", "/api/admin/work-schedules/**").hasAnyRole("admin", "branch_manager")
                            .requestMatchers("/api/employees/**").hasAnyRole("admin", "branch_manager")
                            .requestMatchers("/api/admin/**", "/api/managers/**").hasRole("admin")
                            .anyRequest().authenticated())
                    .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
            return http.build();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder();
        }
    }
