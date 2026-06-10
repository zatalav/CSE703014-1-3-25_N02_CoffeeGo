package com.coffee.orderservice.controller;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Field;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.TreeMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class SandboxPaymentControllerTest {
    private static final String HASH_SECRET = "TEST_HASH_SECRET";

    @Test
    void createVnpayIntentUsesFormEncodingForSignedUrl() throws Exception {
        SandboxPaymentController controller = controller();
        SandboxPaymentController.PaymentIntentRequest request = new SandboxPaymentController.PaymentIntentRequest();
        request.provider = "vnpay";
        request.amount = 35_000L;
        request.orderId = "CG-1";
        request.orderInfo = "Thanh toan don hang CG-1";
        request.returnUrl = "https://example.test/payment-return";

        HttpServletRequest servletRequest = mock(HttpServletRequest.class);
        doReturn(null).when(servletRequest).getHeader("X-Forwarded-For");
        doReturn("127.0.0.1").when(servletRequest).getRemoteAddr();

        String payUrl = controller.create(request, servletRequest).getData().payUrl();

        assertTrue(payUrl.contains("vnp_OrderInfo=Thanh+toan+don+hang+CG-1"));
        assertFalse(payUrl.contains("Thanh%20toan%20don%20hang"));
    }

    @Test
    void verifyVnpayReturnAcceptsFormEncodedSignature() throws Exception {
        SandboxPaymentController controller = controller();
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Amount", "3500000");
        params.put("vnp_BankCode", "NCB");
        params.put("vnp_OrderInfo", "Thanh toan don hang CG-1");
        params.put("vnp_ResponseCode", "00");
        params.put("vnp_TmnCode", "TESTTMN1");
        params.put("vnp_TransactionNo", "14123456");
        params.put("vnp_TransactionStatus", "00");
        params.put("vnp_TxnRef", "CG-1");
        params.put("vnp_SecureHash", hmac(HASH_SECRET, formQuery(params)));

        SandboxPaymentController.VnpayVerificationResponse response =
                controller.verifyVnpayReturn(params).getData();

        assertTrue(response.validSignature());
        assertTrue(response.paid());
    }

    private static SandboxPaymentController controller() throws Exception {
        SandboxPaymentController controller = new SandboxPaymentController();
        setField(controller, "vnpayPayUrl", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        setField(controller, "vnpayTmnCode", "TESTTMN1");
        setField(controller, "vnpayHashSecret", HASH_SECRET);
        setField(controller, "vnpayReturnUrl", "https://example.test/payment-return");
        return controller;
    }

    private static void setField(Object target, String name, String value) throws Exception {
        Field field = SandboxPaymentController.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }

    private static String formQuery(Map<String, String> params) {
        StringBuilder builder = new StringBuilder();
        params.forEach((key, value) -> {
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(URLEncoder.encode(key, StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
        });
        return builder.toString();
    }

    private static String hmac(String secret, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }
}
