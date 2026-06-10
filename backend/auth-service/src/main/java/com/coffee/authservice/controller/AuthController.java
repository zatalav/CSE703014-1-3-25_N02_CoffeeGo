package com.coffee.authservice.controller;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.common.security.AuthenticatedUser;
    import com.coffee.authservice.dto.request.*;
    import com.coffee.authservice.dto.response.LoginResponse;
    import com.coffee.authservice.dto.response.UserInfoResponse;
    import com.coffee.authservice.service.AuthService;
    import jakarta.validation.Valid;
    import org.springframework.security.core.annotation.AuthenticationPrincipal;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/auth")
    public class AuthController {
        private final AuthService authService;

        public AuthController(AuthService authService) {
            this.authService = authService;
        }

        @PostMapping("/login")
        public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
            return ApiResponse.success("Login successful", authService.login(request));
        }

        @PostMapping("/customer/register")
        public ApiResponse<LoginResponse> registerCustomer(@Valid @RequestBody CustomerRegisterRequest request) {
            return ApiResponse.success("Customer registered", authService.registerCustomer(request));
        }

        @PostMapping("/register")
        public ApiResponse<LoginResponse> register(@Valid @RequestBody CustomerRegisterRequest request) {
            return ApiResponse.success("Customer registered", authService.registerCustomer(request));
        }

        @PostMapping("/customer/google")
        public ApiResponse<LoginResponse> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
            return ApiResponse.success("Google login successful", authService.loginWithGoogle(request));
        }

        @PostMapping("/logout")
        public ApiResponse<Void> logout(@RequestBody LogoutRequest request) {
            authService.logout(request);
            return ApiResponse.success("Logout successful", null);
        }

        @PostMapping("/refresh-token")
        public ApiResponse<LoginResponse> refresh(@RequestBody RefreshTokenRequest request) {
            return ApiResponse.success(authService.refresh(request));
        }

        @PostMapping("/forgot-password")
        public ApiResponse<Void> forgotPassword(@RequestBody ForgotPasswordRequest request) {
            authService.forgotPassword(request);
            return ApiResponse.success("OTP sent", null);
        }

        @PostMapping("/verify-otp")
        public ApiResponse<Void> verifyOtp(@RequestBody VerifyOtpRequest request) {
            authService.verifyOtp(request);
            return ApiResponse.success("OTP verified", null);
        }

        @PostMapping("/reset-password")
        public ApiResponse<Void> resetPassword(@RequestBody ResetPasswordRequest request) {
            authService.resetPassword(request);
            return ApiResponse.success("Password reset", null);
        }

        @PostMapping("/change-password")
        public ApiResponse<Void> changePassword(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody ChangePasswordRequest request) {
            authService.changePassword(user, request);
            return ApiResponse.success("Password changed", null);
        }

        @GetMapping("/me")
        public ApiResponse<UserInfoResponse> me(@AuthenticationPrincipal AuthenticatedUser user) {
            return ApiResponse.success(authService.me(user));
        }
    }
