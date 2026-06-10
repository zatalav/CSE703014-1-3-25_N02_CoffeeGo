package com.coffee.orderservice.controller;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/sandbox")
public class SandboxPaymentController {
    private static final DateTimeFormatter VNPAY_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Value("${payment.vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String vnpayPayUrl;

    @Value("${payment.vnpay.tmn-code:2QXUI4J4}")
    private String vnpayTmnCode;

    @Value("${payment.vnpay.hash-secret:SECRETKEY}")
    private String vnpayHashSecret;

    @Value("${payment.vnpay.return-url:http://localhost:8080/payment-return}")
    private String vnpayReturnUrl;

    @PostMapping("/create")
    public ApiResponse<PaymentIntentResponse> create(@RequestBody PaymentIntentRequest request,
                                                     HttpServletRequest servletRequest) {
        if (request == null || request.provider == null || request.provider.isBlank()) {
            throw new BadRequestException("provider is required");
        }
        if (request.amount == null || request.amount < 1000) {
            throw new BadRequestException("amount must be at least 1000 VND");
        }

        String provider = request.provider.toLowerCase();
        String orderId = sanitizeOrderId(blankToDefault(request.orderId, "PAY-" + System.currentTimeMillis()));
        String orderInfo = blankToDefault(request.orderInfo, "Thanh toan don hang " + orderId);
        String returnUrl = blankToDefault(request.returnUrl, vnpayReturnUrl);

        PaymentIntentResponse response = switch (provider) {
            case "vnpay" -> createVnpayIntent(request.amount, orderId, orderInfo, returnUrl, clientIp(servletRequest));
            default -> throw new BadRequestException("Unsupported payment provider: " + request.provider);
        };

        return ApiResponse.success("Created", response);
    }

    @GetMapping("/config")
    public ApiResponse<PaymentConfigResponse> config() {
        return ApiResponse.success(new PaymentConfigResponse(
                "vnpay",
                true,
                vnpayPayUrl,
                vnpayTmnCode,
                maskSecret(vnpayHashSecret),
                vnpayReturnUrl,
                vnpayPayUrl.toLowerCase().contains("sandbox")
        ));
    }

    @PostMapping("/vnpay/verify")
    public ApiResponse<VnpayVerificationResponse> verifyVnpayReturn(@RequestBody Map<String, String> params) {
        return ApiResponse.success(verifyVnpayParams(params == null ? Map.of() : params));
    }

    @GetMapping("/vnpay/verify")
    public ApiResponse<VnpayVerificationResponse> verifyVnpayReturnQuery(@RequestParam Map<String, String> params) {
        return ApiResponse.success(verifyVnpayParams(params == null ? Map.of() : params));
    }

    private VnpayVerificationResponse verifyVnpayParams(Map<String, String> params) {
        String receivedHash = params.getOrDefault("vnp_SecureHash", "");
        Map<String, String> signedParams = new TreeMap<>();
        params.forEach((key, value) -> {
            if (key != null
                    && key.startsWith("vnp_")
                    && !"vnp_SecureHash".equalsIgnoreCase(key)
                    && !"vnp_SecureHashType".equalsIgnoreCase(key)
                    && value != null
                    && !value.isBlank()) {
                signedParams.put(key, value);
            }
        });

        String expectedHash = signedParams.isEmpty() ? "" : hmac("HmacSHA512", vnpayHashSecret, toQueryString(signedParams));
        boolean validSignature = !receivedHash.isBlank() && expectedHash.equalsIgnoreCase(receivedHash);
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        boolean paid = validSignature && "00".equals(responseCode) && ("00".equals(transactionStatus) || transactionStatus == null);
        Long amount = parseVnpayAmount(params.get("vnp_Amount"));
        String message = paid
                ? "Payment success"
                : validSignature ? "Payment failed or cancelled" : "Invalid payment signature";

        return new VnpayVerificationResponse(
                validSignature,
                paid,
                responseCode,
                transactionStatus,
                params.get("vnp_TxnRef"),
                amount,
                message
        );
    }

    private PaymentIntentResponse createVnpayIntent(Long amount, String orderId, String orderInfo,
                                                    String returnUrl, String ipAddress) {
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", vnpayTmnCode);
        params.put("vnp_Amount", String.valueOf(amount * 100));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_BankCode", "VNBANK");
        params.put("vnp_TxnRef", orderId);
        params.put("vnp_OrderInfo", removeVietnameseMarks(orderInfo));
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", ipAddress);
        params.put("vnp_CreateDate", VNPAY_TIME_FORMAT.format(now));
        params.put("vnp_ExpireDate", VNPAY_TIME_FORMAT.format(now.plusMinutes(15)));

        String hashData = toQueryString(params);
        String secureHash = hmac("HmacSHA512", vnpayHashSecret, hashData);
        String payUrl = vnpayPayUrl + "?" + hashData + "&vnp_SecureHash=" + secureHash;
        return new PaymentIntentResponse("vnpay", orderId, amount, payUrl, payUrl, null, "00", "success");
    }

    private String toQueryString(Map<String, String> params) {
        StringBuilder builder = new StringBuilder();
        params.forEach((key, value) -> {
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(encode(key)).append('=').append(encode(value));
        });
        return builder.toString();
    }

    private String hmac(String algorithm, String secret, String data) {
        try {
            Mac mac = Mac.getInstance(algorithm);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), algorithm));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Could not sign payment request", ex);
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String sanitizeOrderId(String value) {
        return value.replaceAll("[^0-9a-zA-Z_.-]", "-");
    }

    private String maskSecret(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.length() <= 8) {
            return "****";
        }
        return trimmed.substring(0, 4) + "****" + trimmed.substring(trimmed.length() - 4);
    }

    private Long parseVnpayAmount(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value) / 100L;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr() == null ? "127.0.0.1" : request.getRemoteAddr();
    }

    private String removeVietnameseMarks(String value) {
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('\u0111', 'd')
                .replace('\u0110', 'D');
    }

    public static class PaymentIntentRequest {
        public String provider;
        public Long amount;
        public String orderId;
        public String orderInfo;
        public String returnUrl;
    }

    public record PaymentConfigResponse(
            String provider,
            boolean enabled,
            String payUrl,
            String tmnCode,
            String maskedHashSecret,
            String returnUrl,
            boolean sandbox
    ) {}

    public record PaymentIntentResponse(
            String provider,
            String orderId,
            Long amount,
            String payUrl,
            String qrData,
            String shortLink,
            String resultCode,
            String message
    ) {}

    public record VnpayVerificationResponse(
            boolean validSignature,
            boolean paid,
            String responseCode,
            String transactionStatus,
            String transactionRef,
            Long amount,
            String message
    ) {}
}
