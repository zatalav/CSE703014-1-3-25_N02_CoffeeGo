package com.coffee.notificationservice.controller;

    import com.coffee.common.response.ApiResponse;
    import java.util.Map;
    import org.slf4j.Logger;
    import org.slf4j.LoggerFactory;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.mail.SimpleMailMessage;
    import org.springframework.mail.javamail.JavaMailSender;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/internal/notifications")
    public class NotificationController {
        private static final Logger log = LoggerFactory.getLogger(NotificationController.class);

        private final JavaMailSender mailSender;
        private final boolean emailEnabled;
        private final String fromAddress;

        public NotificationController(JavaMailSender mailSender,
                                      @Value("${app.notifications.email.enabled:false}") boolean emailEnabled,
                                      @Value("${app.mail.from:no-reply@coffee.local}") String fromAddress) {
            this.mailSender = mailSender;
            this.emailEnabled = emailEnabled;
            this.fromAddress = fromAddress;
        }

        @PostMapping("/email")
        public ApiResponse<Void> email(@RequestBody Map<String, Object> request) {
            String to = stringValue(request.get("to"));
            String subject = stringValue(request.get("subject"));
            String body = stringValue(request.get("body"));

            if (!emailEnabled) {
                log.info("Email notification disabled. Message: {}", request);
                return ApiResponse.success("Email notification logged", null);
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            return ApiResponse.success("Email sent", null);
        }

        @PostMapping("/system-alert")
        public ApiResponse<Void> systemAlert(@RequestBody Map<String, Object> request) {
            log.info("Mock system alert: {}", request);
            return ApiResponse.success("System alert logged", null);
        }

        private String stringValue(Object value) {
            return value == null ? "" : String.valueOf(value);
        }
    }
