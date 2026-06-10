package com.coffee.authservice.entity;

    import jakarta.persistence.Column;
    import jakarta.persistence.Entity;
    import jakarta.persistence.GeneratedValue;
    import jakarta.persistence.GenerationType;
    import jakarta.persistence.Id;
    import jakarta.persistence.Table;
    import java.time.LocalDateTime;

    @Entity
    @Table(name = "refresh_token")
    public class RefreshToken {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        @Column(name = "token_id")
        private Long tokenId;

        @Column(name = "employee_id", nullable = false)
        private Long employeeId;

        @Column(name = "token", nullable = false, unique = true, length = 500)
        private String token;

        @Column(name = "expires_at", nullable = false)
        private LocalDateTime expiresAt;

        @Column(name = "revoked", nullable = false)
        private Boolean revoked = false;

        @Column(name = "created_at")
        private LocalDateTime createdAt;

        public Long getTokenId() { return tokenId; }
        public void setTokenId(Long tokenId) { this.tokenId = tokenId; }
        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public LocalDateTime getExpiresAt() { return expiresAt; }
        public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
        public Boolean getRevoked() { return revoked; }
        public void setRevoked(Boolean revoked) { this.revoked = revoked; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }
