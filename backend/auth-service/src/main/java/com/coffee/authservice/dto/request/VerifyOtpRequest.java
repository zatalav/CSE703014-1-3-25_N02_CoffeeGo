package com.coffee.authservice.dto.request;

        public class VerifyOtpRequest {
            private String identifier; private String otp;
            public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
        }
