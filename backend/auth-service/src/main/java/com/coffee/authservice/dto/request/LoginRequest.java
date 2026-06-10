package com.coffee.authservice.dto.request;

    import jakarta.validation.constraints.NotBlank;

    public class LoginRequest {
        private String email;
        private String phoneNumber;
        private String identifier;
        @NotBlank
        private String password;

        public String resolveIdentifier() {
            if (identifier != null && !identifier.isBlank()) return identifier;
            if (email != null && !email.isBlank()) return email;
            return phoneNumber;
        }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
        public String getIdentifier() { return identifier; }
        public void setIdentifier(String identifier) { this.identifier = identifier; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
