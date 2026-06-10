package com.coffee.common.security;

    import com.coffee.common.response.ApiResponse;
    import com.fasterxml.jackson.databind.ObjectMapper;
    import io.jsonwebtoken.Claims;
    import jakarta.servlet.FilterChain;
    import jakarta.servlet.ServletException;
    import jakarta.servlet.http.HttpServletRequest;
    import jakarta.servlet.http.HttpServletResponse;
    import java.io.IOException;
    import java.text.Normalizer;
    import java.util.LinkedHashSet;
    import java.util.Locale;
    import java.util.Set;
    import org.springframework.http.MediaType;
    import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
    import org.springframework.security.core.authority.SimpleGrantedAuthority;
    import org.springframework.security.core.context.SecurityContextHolder;
    import org.springframework.stereotype.Component;
    import org.springframework.web.filter.OncePerRequestFilter;

    @Component
    public class JwtAuthenticationFilter extends OncePerRequestFilter {
        private final JwtService jwtService;
        private final ObjectMapper objectMapper;

        public JwtAuthenticationFilter(JwtService jwtService, ObjectMapper objectMapper) {
            this.jwtService = jwtService;
            this.objectMapper = objectMapper;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            String header = request.getHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }
            try {
                Claims claims = jwtService.parse(header.substring(7));
                String roleName = String.valueOf(claims.get("roleName"));
                Long userId = Long.valueOf(String.valueOf(claims.get("userId")));
                Long branchId = claims.get("branchId") == null ? null : Long.valueOf(String.valueOf(claims.get("branchId")));
                AuthenticatedUser principal = new AuthenticatedUser(userId, roleName, branchId);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        authoritiesFor(roleName)
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
                filterChain.doFilter(request, response);
            } catch (Exception ex) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getWriter(), ApiResponse.error("Invalid or expired token", null));
            }
        }

        private Set<SimpleGrantedAuthority> authoritiesFor(String roleName) {
            Set<String> roleKeys = new LinkedHashSet<>();
            if (roleName != null && !roleName.isBlank()) {
                roleKeys.add(roleName);
            }

            String normalized = normalizeRole(roleName);
            if (!normalized.isBlank()) {
                roleKeys.add(normalized);
            }

            String text = normalized.replace('_', ' ');
            if (normalized.equals("admin") || text.contains("quan tri")) {
                roleKeys.add("admin");
            }
            if (normalized.equals("warehouse_manager") || text.contains("warehouse manager") || text.contains("quan ly kho")) {
                roleKeys.add("warehouse_manager");
            }
            if (normalized.equals("warehouse_staff") || normalized.endsWith("_warehouse_staff")
                    || text.contains("warehouse staff") || text.contains("nhan vien kho")) {
                roleKeys.add("warehouse_staff");
            }
            if (normalized.equals("branch_manager") || text.contains("branch manager")
                    || text.contains("sale manager") || text.contains("sales manager")
                    || text.contains("quan ly chi nhanh") || text.contains("quan ly ban hang")) {
                roleKeys.add("branch_manager");
            }
            if (normalized.equals("sales_staff") || normalized.equals("sale_staff")
                    || normalized.equals("branch_staff") || normalized.endsWith("_branch_staff")
                    || normalized.equals("staff") || normalized.equals("employee")
                    || normalized.endsWith("_sales_staff") || normalized.endsWith("_employee")
                    || text.contains("sales staff") || text.contains("sale staff")
                    || text.contains("branch staff")
                    || text.contains("cashier") || text.contains("nhan vien ban hang")
                    || text.contains("nhan vien pha che")
                    || (text.contains("nhan vien") && !text.contains("quan ly")
                        && !text.contains("nhan vien van chuyen")
                        && !text.contains("nhan vien giao hang"))) {
                roleKeys.add("sales_staff");
            }
            if (normalized.equals("delivery_staff") || normalized.equals("shipper")
                    || normalized.endsWith("_delivery_staff")
                    || text.contains("delivery staff") || text.contains("shipper")
                    || text.contains("nhan vien van chuyen") || text.contains("nhan vien giao hang")) {
                roleKeys.add("delivery_staff");
            }

            Set<SimpleGrantedAuthority> authorities = new LinkedHashSet<>();
            roleKeys.forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
            return authorities;
        }

        private String normalizeRole(String roleName) {
            if (roleName == null) {
                return "";
            }
            return Normalizer.normalize(roleName, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9]+", "_")
                    .replaceAll("^_+|_+$", "");
        }
    }
