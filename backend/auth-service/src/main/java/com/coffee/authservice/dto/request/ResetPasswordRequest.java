package com.coffee.authservice.dto.request;

        public class ResetPasswordRequest {
            private String identifier; private String otp; private String newPassword;
            public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
        }
