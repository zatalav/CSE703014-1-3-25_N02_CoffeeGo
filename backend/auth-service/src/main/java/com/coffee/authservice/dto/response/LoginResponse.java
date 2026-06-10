package com.coffee.authservice.dto.response;

    public class LoginResponse {
        private String accessToken;
        private String refreshToken;
        private String role;
        private UserInfoResponse userInfo;

        public String getAccessToken() { return accessToken; }
        public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public UserInfoResponse getUserInfo() { return userInfo; }
        public void setUserInfo(UserInfoResponse userInfo) { this.userInfo = userInfo; }

        public String getToken() { return accessToken; }
        public Long getUserId() { return userInfo == null ? null : userInfo.getId(); }
        public String getFullName() { return userInfo == null ? null : userInfo.getName(); }
        public String getEmail() { return userInfo == null ? null : userInfo.getEmail(); }
    }
