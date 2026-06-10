package com.coffee.authservice.service;

    import com.coffee.authservice.dto.request.*;
    import com.coffee.authservice.dto.response.LoginResponse;
    import com.coffee.authservice.dto.response.UserInfoResponse;
    import com.coffee.common.security.AuthenticatedUser;

    public interface AuthService {
        LoginResponse login(LoginRequest request);
        LoginResponse loginCustomer(LoginRequest request);
        LoginResponse registerCustomer(CustomerRegisterRequest request);
        LoginResponse loginWithGoogle(GoogleLoginRequest request);
        void logout(LogoutRequest request);
        LoginResponse refresh(RefreshTokenRequest request);
        void forgotPassword(ForgotPasswordRequest request);
        void verifyOtp(VerifyOtpRequest request);
        void resetPassword(ResetPasswordRequest request);
        void changePassword(AuthenticatedUser user, ChangePasswordRequest request);
        UserInfoResponse me(AuthenticatedUser user);
    }
