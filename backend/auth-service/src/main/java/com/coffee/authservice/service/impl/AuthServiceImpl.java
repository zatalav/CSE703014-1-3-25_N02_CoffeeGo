package com.coffee.authservice.service.impl;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.exception.UnauthorizedException;
    import com.coffee.common.security.AuthenticatedUser;
    import com.coffee.common.security.JwtService;
    import com.coffee.authservice.dto.request.*;
    import com.coffee.authservice.dto.response.LoginResponse;
    import com.coffee.authservice.dto.response.UserInfoResponse;
    import com.coffee.authservice.entity.Customer;
    import com.coffee.authservice.entity.CustomerDetail;
    import com.coffee.authservice.entity.Employee;
    import com.coffee.authservice.entity.EmployeeDetail;
    import com.coffee.authservice.entity.RefreshToken;
    import com.coffee.authservice.entity.Role;
    import com.coffee.authservice.repository.CustomerDetailRepository;
    import com.coffee.authservice.repository.CustomerRepository;
    import com.coffee.authservice.repository.EmployeeDetailRepository;
    import com.coffee.authservice.repository.EmployeeRepository;
    import com.coffee.authservice.repository.RefreshTokenRepository;
    import com.coffee.authservice.repository.RoleRepository;
    import com.coffee.authservice.service.AuthService;
    import java.security.SecureRandom;
    import java.time.Instant;
    import java.time.LocalDateTime;
    import java.util.List;
    import java.util.Locale;
    import java.util.Map;
    import java.util.UUID;
    import java.util.concurrent.ConcurrentHashMap;
    import org.slf4j.Logger;
    import org.slf4j.LoggerFactory;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.jdbc.core.JdbcTemplate;
    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.stereotype.Service;
    import org.springframework.transaction.annotation.Transactional;
    import org.springframework.web.client.RestClientException;
    import org.springframework.web.client.RestTemplate;
    import org.springframework.web.util.UriComponentsBuilder;

    @Service
    public class AuthServiceImpl implements AuthService {
        private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
        private static final String CUSTOMER_ROLE = "Customer";
        private static final String CUSTOMER_REFRESH_TOKEN_PREFIX = "cus_";

        private final EmployeeRepository employeeRepository;
        private final EmployeeDetailRepository detailRepository;
        private final CustomerRepository customerRepository;
        private final CustomerDetailRepository customerDetailRepository;
        private final RoleRepository roleRepository;
        private final RefreshTokenRepository refreshTokenRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final JdbcTemplate jdbcTemplate;
        private final long refreshTokenDays;
        private final String notificationServiceUrl;
        private final String adminEmail;
        private final String adminPasswordRecoveryEmail;
        private final String googleClientId;
        private final RestTemplate restTemplate = new RestTemplate();
        private final Map<String, String> otpStore = new ConcurrentHashMap<>();
        private final SecureRandom secureRandom = new SecureRandom();
        private static final String TEMPORARY_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
        private static final int TEMPORARY_PASSWORD_LENGTH = 12;

        public AuthServiceImpl(EmployeeRepository employeeRepository, EmployeeDetailRepository detailRepository,
                               CustomerRepository customerRepository, CustomerDetailRepository customerDetailRepository,
                               RoleRepository roleRepository, RefreshTokenRepository refreshTokenRepository,
                               PasswordEncoder passwordEncoder, JwtService jwtService, JdbcTemplate jdbcTemplate,
                               @Value("${app.jwt.refresh-token-days:7}") long refreshTokenDays,
                               @Value("${app.notification-service.url:http://localhost:8092}") String notificationServiceUrl,
                               @Value("${app.seed.admin-email:admin@coffee.local}") String adminEmail,
                               @Value("${app.admin.password-recovery-email:userstest2212@gmail.com}") String adminPasswordRecoveryEmail,
                               @Value("${app.google.client-id:}") String googleClientId) {
            this.employeeRepository = employeeRepository;
            this.detailRepository = detailRepository;
            this.customerRepository = customerRepository;
            this.customerDetailRepository = customerDetailRepository;
            this.roleRepository = roleRepository;
            this.refreshTokenRepository = refreshTokenRepository;
            this.passwordEncoder = passwordEncoder;
            this.jwtService = jwtService;
            this.jdbcTemplate = jdbcTemplate;
            this.refreshTokenDays = refreshTokenDays;
            this.notificationServiceUrl = notificationServiceUrl.replaceAll("/+$", "");
            this.adminEmail = adminEmail;
            this.adminPasswordRecoveryEmail = adminPasswordRecoveryEmail;
            this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        }

        @Override
        @Transactional
        public LoginResponse login(LoginRequest request) {
            try {
                return loginEmployee(request);
            } catch (UnauthorizedException ex) {
                return loginCustomer(request);
            }
        }

        private LoginResponse loginEmployee(LoginRequest request) {
            String identifier = normalizeLoginIdentifier(request.resolveIdentifier());
            if (identifier == null || identifier.isBlank()) {
                throw new BadRequestException("Email or phone number is required");
            }
            EmployeeDetail detail = detailRepository.findByEmail(identifier)
                    .or(() -> detailRepository.findByPhoneNumber(identifier))
                    .orElseThrow(() -> new UnauthorizedException("Invalid email/phone or password"));
            Employee employee = employeeRepository.findById(detail.getEmployeeId())
                    .orElseThrow(() -> new UnauthorizedException("Invalid email/phone or password"));
            if (!"active".equalsIgnoreCase(employee.getStatus())) {
                throw new UnauthorizedException("Inactive accounts cannot log in");
            }
            if (detail.getPassword() == null || !passwordEncoder.matches(request.getPassword(), detail.getPassword())) {
                throw new UnauthorizedException("Invalid email/phone or password");
            }
            Role role = roleRepository.findById(employee.getRoleId())
                    .orElseThrow(() -> new UnauthorizedException("Employee role is missing"));
            String accessToken = jwtService.generateAccessToken(employee.getId(), role.getRoleName(), employee.getBranchId());
            String refreshTokenValue = UUID.randomUUID().toString().replace("-", "");
            RefreshToken refreshToken = new RefreshToken();
            refreshToken.setEmployeeId(employee.getId());
            refreshToken.setToken(refreshTokenValue);
            refreshToken.setExpiresAt(LocalDateTime.now().plusDays(refreshTokenDays));
            refreshToken.setRevoked(false);
            refreshToken.setCreatedAt(LocalDateTime.now());
            refreshTokenRepository.save(refreshToken);

            LoginResponse response = new LoginResponse();
            response.setAccessToken(accessToken);
            response.setRefreshToken(refreshTokenValue);
            response.setRole(role.getRoleName());
            response.setUserInfo(toUserInfo(employee, detail, role));
            return response;
        }

        @Override
        @Transactional
        public LoginResponse loginCustomer(LoginRequest request) {
            String identifier = normalizeLoginIdentifier(request.resolveIdentifier());
            if (identifier == null || identifier.isBlank()) {
                throw new BadRequestException("Email or phone number is required");
            }
            CustomerDetail detail = customerDetailRepository.findByEmail(normalizeEmail(identifier))
                    .or(() -> customerDetailRepository.findByPhoneNumber(identifier.trim()))
                    .orElseThrow(() -> new UnauthorizedException("Invalid email/phone or password"));
            Customer customer = customerRepository.findById(detail.getCustomerId())
                    .orElseThrow(() -> new UnauthorizedException("Customer account not found"));
            if (customer.getStatus() != null && !"active".equalsIgnoreCase(customer.getStatus())) {
                throw new UnauthorizedException("Inactive customer accounts cannot log in");
            }
            if (detail.getPassword() == null || !passwordEncoder.matches(request.getPassword(), detail.getPassword())) {
                throw new UnauthorizedException("Invalid email/phone or password");
            }
            ensureCustomerLoyalty(customer.getId());
            return customerLoginResponse(customer, detail);
        }

        @Override
        @Transactional
        public LoginResponse registerCustomer(CustomerRegisterRequest request) {
            String email = normalizeEmail(request.getEmail());
            String phone = normalizePhone(request.getPhoneNumber());
            if (email == null || email.isBlank()) {
                throw new BadRequestException("Email is required");
            }
            if (phone == null || phone.isBlank()) {
                throw new BadRequestException("Phone number is required");
            }
            if (customerDetailRepository.existsByEmail(email)) {
                throw new BadRequestException("Email is already registered");
            }
            if (customerDetailRepository.existsByPhoneNumber(phone)) {
                throw new BadRequestException("Phone number is already registered");
            }

            LocalDateTime now = LocalDateTime.now();
            Customer customer = new Customer();
            customer.setName(request.getName().trim());
            customer.setGender(blankToNull(request.getGender()));
            customer.setDateOfBirth(request.getDateOfBirth());
            customer.setStatus("active");
            customer.setCreatedAt(now);
            customer = customerRepository.save(customer);

            CustomerDetail detail = new CustomerDetail();
            detail.setCustomerId(customer.getId());
            detail.setEmail(email);
            detail.setPhoneNumber(phone);
            detail.setAddress(blankToNull(request.getAddress()));
            detail.setPassword(passwordEncoder.encode(request.getPassword()));
            detail.setUpdatedAt(now);
            customerDetailRepository.save(detail);

            ensureCustomerLoyalty(customer.getId());
            return customerLoginResponse(customer, detail);
        }

        @Override
        @Transactional
        public LoginResponse loginWithGoogle(GoogleLoginRequest request) {
            if (googleClientId == null || googleClientId.isBlank()) {
                throw new BadRequestException("Google login is not configured");
            }

            Map<String, Object> googleUser = verifyGoogleIdToken(request.getIdToken());
            String email = normalizeEmail(stringClaim(googleUser, "email"));
            if (email == null || email.isBlank()) {
                throw new UnauthorizedException("Google account email is missing");
            }
            if (!isTrueClaim(googleUser.get("email_verified"))) {
                throw new UnauthorizedException("Google account email is not verified");
            }

            String googleName = stringClaim(googleUser, "name");
            String displayName = googleName == null || googleName.isBlank()
                    ? email.substring(0, email.indexOf('@') > 0 ? email.indexOf('@') : email.length())
                    : googleName;

            CustomerDetail detail = customerDetailRepository.findByEmail(email)
                    .orElseGet(() -> createGoogleCustomer(email, displayName, stringClaim(googleUser, "sub")));
            Customer customer = customerRepository.findById(detail.getCustomerId())
                    .orElseThrow(() -> new UnauthorizedException("Customer account not found"));
            if (customer.getStatus() != null && !"active".equalsIgnoreCase(customer.getStatus())) {
                throw new UnauthorizedException("Inactive customer accounts cannot log in");
            }

            ensureCustomerLoyalty(customer.getId());
            return customerLoginResponse(customer, detail);
        }

        @Override
        @Transactional
        public void logout(LogoutRequest request) {
            if (request.getRefreshToken() == null) return;
            refreshTokenRepository.findByTokenAndRevokedFalse(request.getRefreshToken()).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        }

        @Override
        @Transactional
        public LoginResponse refresh(RefreshTokenRequest request) {
            RefreshToken token = refreshTokenRepository.findByTokenAndRevokedFalse(request.getRefreshToken())
                    .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
            if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
                throw new UnauthorizedException("Refresh token expired");
            }
            if (token.getToken() != null && token.getToken().startsWith(CUSTOMER_REFRESH_TOKEN_PREFIX)) {
                Customer customer = customerRepository.findById(token.getEmployeeId())
                        .orElseThrow(() -> new UnauthorizedException("Customer not found"));
                CustomerDetail detail = customerDetailRepository.findById(customer.getId())
                        .orElseThrow(() -> new UnauthorizedException("Customer detail not found"));
                LoginResponse response = new LoginResponse();
                response.setAccessToken(jwtService.generateAccessToken(customer.getId(), CUSTOMER_ROLE, null));
                response.setRefreshToken(token.getToken());
                response.setRole(CUSTOMER_ROLE);
                response.setUserInfo(toCustomerUserInfo(customer, detail));
                return response;
            }
            Employee employee = employeeRepository.findById(token.getEmployeeId()).orElseThrow(() -> new UnauthorizedException("Employee not found"));
            EmployeeDetail detail = detailRepository.findById(employee.getId()).orElseThrow(() -> new UnauthorizedException("Employee detail not found"));
            Role role = roleRepository.findById(employee.getRoleId()).orElseThrow(() -> new UnauthorizedException("Role not found"));
            LoginResponse response = new LoginResponse();
            response.setAccessToken(jwtService.generateAccessToken(employee.getId(), role.getRoleName(), employee.getBranchId()));
            response.setRefreshToken(token.getToken());
            response.setRole(role.getRoleName());
            response.setUserInfo(toUserInfo(employee, detail, role));
            return response;
        }

        @Override
        @Transactional
        public void forgotPassword(ForgotPasswordRequest request) {
            String identifier = normalizeLoginIdentifier(request.getIdentifier());
            if (identifier == null || identifier.isBlank()) {
                throw new BadRequestException("Email or phone number is required");
            }
            if (identifier.equalsIgnoreCase(adminEmail)) {
                EmployeeDetail adminDetail = detailRepository.findByEmail(adminEmail)
                        .orElseThrow(() -> new BadRequestException("Admin account not found"));
                String newPassword = generateTemporaryPassword();
                adminDetail.setPassword(passwordEncoder.encode(newPassword));
                detailRepository.save(adminDetail);
                sendAdminNewPassword(newPassword);
                return;
            }
            String otp = "123456";
            otpStore.put(identifier, otp);
            sendForgotPasswordOtp(identifier, otp);
        }

        @Override
        public void verifyOtp(VerifyOtpRequest request) {
            if (!request.getOtp().equals(otpStore.get(request.getIdentifier()))) {
                throw new BadRequestException("Invalid OTP");
            }
        }

        @Override
        @Transactional
        public void resetPassword(ResetPasswordRequest request) {
            verifyOtp(toVerifyRequest(request));
            EmployeeDetail detail = detailRepository.findByEmail(request.getIdentifier())
                    .or(() -> detailRepository.findByPhoneNumber(request.getIdentifier()))
                    .orElseThrow(() -> new BadRequestException("Account not found"));
            detail.setPassword(passwordEncoder.encode(request.getNewPassword()));
            detailRepository.save(detail);
            otpStore.remove(request.getIdentifier());
        }

        @Override
        @Transactional
        public void changePassword(AuthenticatedUser user, ChangePasswordRequest request) {
            EmployeeDetail detail = detailRepository.findById(user.getUserId()).orElseThrow(() -> new BadRequestException("Account not found"));
            if (!passwordEncoder.matches(request.getCurrentPassword(), detail.getPassword())) {
                throw new BadRequestException("Current password is incorrect");
            }
            detail.setPassword(passwordEncoder.encode(request.getNewPassword()));
            detailRepository.save(detail);
        }

        @Override
        public UserInfoResponse me(AuthenticatedUser user) {
            if (CUSTOMER_ROLE.equalsIgnoreCase(user.getRoleName())) {
                Customer customer = customerRepository.findById(user.getUserId()).orElseThrow(() -> new BadRequestException("Customer account not found"));
                CustomerDetail detail = customerDetailRepository.findById(customer.getId()).orElseThrow(() -> new BadRequestException("Customer detail not found"));
                return toCustomerUserInfo(customer, detail);
            }
            Employee employee = employeeRepository.findById(user.getUserId()).orElseThrow(() -> new BadRequestException("Account not found"));
            EmployeeDetail detail = detailRepository.findById(employee.getId()).orElseThrow(() -> new BadRequestException("Account detail not found"));
            Role role = roleRepository.findById(employee.getRoleId()).orElseThrow(() -> new BadRequestException("Role not found"));
            return toUserInfo(employee, detail, role);
        }

        private VerifyOtpRequest toVerifyRequest(ResetPasswordRequest request) {
            VerifyOtpRequest verify = new VerifyOtpRequest();
            verify.setIdentifier(request.getIdentifier());
            verify.setOtp(request.getOtp());
            return verify;
        }

        private void sendForgotPasswordOtp(String identifier, String otp) {
            if (identifier == null || !identifier.contains("@")) {
                log.info("Forgot-password OTP for {}: {}", identifier, otp);
                return;
            }
            try {
                restTemplate.postForEntity(
                        notificationServiceUrl + "/internal/notifications/email",
                        Map.of(
                                "to", identifier,
                                "subject", "Ma OTP dat lai mat khau Coffee Admin",
                                "body", "Ma OTP dat lai mat khau cua ban la: " + otp
                        ),
                        Void.class
                );
            } catch (RestClientException ex) {
                log.warn("Could not send forgot-password OTP to {}: {}", identifier, ex.getMessage());
            }
        }

        private void sendAdminNewPassword(String newPassword) {
            String subject = "Mat khau moi cho tai khoan Coffee Admin";
            String body = "Mat khau moi cua tai khoan " + adminEmail + " la: " + newPassword;
            try {
                restTemplate.postForEntity(
                        notificationServiceUrl + "/internal/notifications/email",
                        Map.of(
                                "to", adminPasswordRecoveryEmail,
                                "subject", subject,
                                "body", body
                        ),
                        Void.class
                );
            } catch (RestClientException ex) {
                log.warn("Could not send admin password recovery email to {}: {}", adminPasswordRecoveryEmail, ex.getMessage());
            }
        }

        private String generateTemporaryPassword() {
            StringBuilder password = new StringBuilder(TEMPORARY_PASSWORD_LENGTH);
            for (int i = 0; i < TEMPORARY_PASSWORD_LENGTH; i++) {
                password.append(TEMPORARY_PASSWORD_CHARS.charAt(secureRandom.nextInt(TEMPORARY_PASSWORD_CHARS.length())));
            }
            return password.toString();
        }

        @SuppressWarnings("unchecked")
        private Map<String, Object> verifyGoogleIdToken(String idToken) {
            if (idToken == null || idToken.isBlank()) {
                throw new BadRequestException("Google idToken is required");
            }
            String normalizedToken = idToken.trim();
            try {
                var uri = UriComponentsBuilder.fromUriString("https://oauth2.googleapis.com/tokeninfo")
                        .queryParam("id_token", normalizedToken)
                        .build()
                        .encode()
                        .toUri();
                Map<String, Object> claims = restTemplate.getForObject(uri, Map.class);
                if (claims == null || claims.isEmpty()) {
                    throw new UnauthorizedException("Invalid Google token");
                }

                String audience = stringClaim(claims, "aud");
                if (!googleClientId.equals(audience)) {
                    throw new UnauthorizedException("Google token audience does not match this application");
                }

                String issuer = stringClaim(claims, "iss");
                if (!"accounts.google.com".equals(issuer) && !"https://accounts.google.com".equals(issuer)) {
                    throw new UnauthorizedException("Invalid Google token issuer");
                }

                String expiresAt = stringClaim(claims, "exp");
                if (expiresAt != null && !expiresAt.isBlank()) {
                    try {
                        if (Instant.ofEpochSecond(Long.parseLong(expiresAt)).isBefore(Instant.now())) {
                            throw new UnauthorizedException("Google token has expired");
                        }
                    } catch (NumberFormatException ex) {
                        throw new UnauthorizedException("Invalid Google token expiration");
                    }
                }

                return claims;
            } catch (RestClientException ex) {
                log.warn("Google token verification failed: {}", ex.getMessage());
                throw new UnauthorizedException("Invalid Google token");
            }
        }

        private CustomerDetail createGoogleCustomer(String email, String name, String googleSubject) {
            Customer customer = new Customer();
            customer.setName(name);
            customer.setStatus("active");
            customer.setCreatedAt(LocalDateTime.now());
            customer = customerRepository.save(customer);

            CustomerDetail detail = new CustomerDetail();
            detail.setCustomerId(customer.getId());
            detail.setEmail(email);
            detail.setPassword(passwordEncoder.encode("google:" + (googleSubject == null ? UUID.randomUUID() : googleSubject)));
            detail.setUpdatedAt(LocalDateTime.now());
            return customerDetailRepository.save(detail);
        }

        private LoginResponse customerLoginResponse(Customer customer, CustomerDetail detail) {
            String refreshTokenValue = CUSTOMER_REFRESH_TOKEN_PREFIX + UUID.randomUUID().toString().replace("-", "");
            RefreshToken refreshToken = new RefreshToken();
            refreshToken.setEmployeeId(customer.getId());
            refreshToken.setToken(refreshTokenValue);
            refreshToken.setExpiresAt(LocalDateTime.now().plusDays(refreshTokenDays));
            refreshToken.setRevoked(false);
            refreshToken.setCreatedAt(LocalDateTime.now());
            refreshTokenRepository.save(refreshToken);

            LoginResponse response = new LoginResponse();
            response.setAccessToken(jwtService.generateAccessToken(customer.getId(), CUSTOMER_ROLE, null));
            response.setRefreshToken(refreshTokenValue);
            response.setRole(CUSTOMER_ROLE);
            response.setUserInfo(toCustomerUserInfo(customer, detail));
            return response;
        }

        private void ensureCustomerLoyalty(Long customerId) {
            if (customerId == null || customerLoyaltyExists(customerId)) {
                return;
            }
            jdbcTemplate.update(
                    """
                    INSERT INTO Customer_loyalty
                        (customer_id, rank_id, exp_point, drips_point, total_money, total_orders, updated_at)
                    VALUES (?, ?, 0, 0, 0, 0, ?)
                    """,
                    customerId,
                    defaultRankId(),
                    LocalDateTime.now()
            );
        }

        private boolean customerLoyaltyExists(Long customerId) {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM Customer_loyalty WHERE customer_id = ?",
                    Integer.class,
                    customerId
            );
            return count != null && count > 0;
        }

        private Long defaultRankId() {
            List<Long> goldRankIds = jdbcTemplate.queryForList(
                    """
                    SELECT rank_id
                    FROM Membership_rank
                    WHERE LOWER(rank_name) = 'gold'
                      AND (status IS NULL OR LOWER(status) = 'active')
                    ORDER BY rank_id ASC
                    LIMIT 1
                    """,
                    Long.class
            );
            if (!goldRankIds.isEmpty()) {
                return goldRankIds.get(0);
            }
            List<Long> rankIds = jdbcTemplate.queryForList(
                    """
                    SELECT rank_id
                    FROM Membership_rank
                    WHERE status IS NULL OR LOWER(status) = 'active'
                    ORDER BY rank_order ASC, rank_id ASC
                    LIMIT 1
                    """,
                    Long.class
            );
            return rankIds.isEmpty() ? 1L : rankIds.get(0);
        }

        private UserInfoResponse toCustomerUserInfo(Customer customer, CustomerDetail detail) {
            UserInfoResponse user = new UserInfoResponse();
            user.setId(customer.getId());
            user.setName(customer.getName());
            user.setEmail(detail.getEmail());
            user.setPhoneNumber(detail.getPhoneNumber());
            user.setRoleName(CUSTOMER_ROLE);
            user.setBranchId(null);
            user.setStatus(customer.getStatus());
            fillCustomerLoyalty(user, customer.getId());
            return user;
        }

        private void fillCustomerLoyalty(UserInfoResponse user, Long customerId) {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    """
                    SELECT cl.exp_point, cl.drips_point, mr.rank_name
                    FROM Customer_loyalty cl
                    LEFT JOIN Membership_rank mr ON mr.rank_id = cl.rank_id
                    WHERE cl.customer_id = ?
                    LIMIT 1
                    """,
                    customerId
            );
            if (rows.isEmpty()) {
                user.setExpPoints(0);
                user.setDripPoints(0);
                user.setTier("Gold");
                return;
            }
            Map<String, Object> row = rows.get(0);
            user.setExpPoints(toInteger(row.get("exp_point")));
            user.setDripPoints(toInteger(row.get("drips_point")));
            Object tier = row.get("rank_name");
            user.setTier(tier == null || String.valueOf(tier).isBlank() ? "Gold" : String.valueOf(tier));
        }

        private boolean isTrueClaim(Object value) {
            return Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(String.valueOf(value));
        }

        private String normalizeEmail(String email) {
            return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        }

        private String normalizePhone(String phone) {
            return phone == null ? null : phone.trim();
        }

        private String blankToNull(String value) {
            return value == null || value.isBlank() ? null : value.trim();
        }

        private Integer toInteger(Object value) {
            if (value == null) return 0;
            if (value instanceof Number number) return number.intValue();
            try {
                return Integer.parseInt(String.valueOf(value));
            } catch (NumberFormatException ex) {
                return 0;
            }
        }

        private String stringClaim(Map<String, Object> claims, String key) {
            Object value = claims.get(key);
            return value == null ? null : String.valueOf(value);
        }

        private UserInfoResponse toUserInfo(Employee employee, EmployeeDetail detail, Role role) {
            UserInfoResponse user = new UserInfoResponse();
            user.setId(employee.getId());
            user.setName(employee.getName());
            user.setEmail(detail.getEmail());
            user.setPhoneNumber(detail.getPhoneNumber());
            user.setRoleName(role.getRoleName());
            user.setBranchId(employee.getBranchId());
            user.setStatus(employee.getStatus());
            return user;
        }

        private String normalizeLoginIdentifier(String identifier) {
            if (identifier == null) {
                return null;
            }
            String trimmed = identifier.trim();
            return "admin".equalsIgnoreCase(trimmed) ? adminEmail : trimmed;
        }
    }
