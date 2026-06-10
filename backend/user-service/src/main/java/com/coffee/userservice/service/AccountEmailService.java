package com.coffee.userservice.service;

import com.coffee.common.exception.BadRequestException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class AccountEmailService {
    private final RestTemplate restTemplate = new RestTemplate();
    private final String notificationServiceUrl;

    public AccountEmailService(@Value("${app.notification-service.url:http://localhost:8092}") String notificationServiceUrl) {
        this.notificationServiceUrl = notificationServiceUrl.replaceAll("/+$", "");
    }

    public void sendTemporaryPassword(String email, String name, String roleName, String temporaryPassword) {
        if (email == null || email.isBlank()) {
            return;
        }

        String displayName = name == null || name.isBlank() ? "nhan vien" : name.trim();
        String displayRole = roleName == null || roleName.isBlank() ? "nhan vien" : roleName.trim();
        String subject = "Thong tin dang nhap Coffee Admin";
        String body = """
                Xin chao %s,

                Tai khoan Coffee Admin cua ban da duoc tao voi chuc danh: %s.

                Email dang nhap: %s
                Mat khau tam thoi: %s

                Vui long dang nhap va doi mat khau sau lan dang nhap dau tien.
                """.formatted(displayName, displayRole, email.trim(), temporaryPassword);

        try {
            restTemplate.postForEntity(
                    notificationServiceUrl + "/internal/notifications/email",
                    Map.of("to", email.trim(), "subject", subject, "body", body),
                    Void.class
            );
        } catch (RestClientException ex) {
            throw new BadRequestException("Could not send account email to " + email + ": " + ex.getMessage());
        }
    }
}
