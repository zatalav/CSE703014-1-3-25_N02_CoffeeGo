package com.coffee.common.security;

    import io.jsonwebtoken.Claims;
    import io.jsonwebtoken.Jwts;
    import io.jsonwebtoken.SignatureAlgorithm;
    import io.jsonwebtoken.security.Keys;
    import java.nio.charset.StandardCharsets;
    import java.security.Key;
    import java.time.Duration;
    import java.time.Instant;
    import java.util.Arrays;
    import java.util.Date;
    import java.util.HashMap;
    import java.util.Map;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.stereotype.Component;

    @Component
    public class JwtService {
        private final String secret;
        private final long accessTokenMinutes;

        public JwtService(
                @Value("${app.jwt.secret}") String secret,
                @Value("${app.jwt.access-token-minutes:120}") long accessTokenMinutes
        ) {
            this.secret = secret;
            this.accessTokenMinutes = accessTokenMinutes;
        }

        public String generateAccessToken(Long userId, String roleName, Long branchId) {
            Map<String, Object> claims = new HashMap<>();
            claims.put("userId", userId);
            claims.put("roleName", roleName);
            claims.put("branchId", branchId);
            Instant now = Instant.now();
            return Jwts.builder()
                    .setClaims(claims)
                    .setSubject(String.valueOf(userId))
                    .setIssuedAt(Date.from(now))
                    .setExpiration(Date.from(now.plus(Duration.ofMinutes(accessTokenMinutes))))
                    .signWith(key(), SignatureAlgorithm.HS256)
                    .compact();
        }

        public Claims parse(String token) {
            return Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody();
        }

        private Key key() {
            byte[] bytes = Arrays.copyOf(secret.getBytes(StandardCharsets.UTF_8), 64);
            return Keys.hmacShaKeyFor(bytes);
        }
    }
