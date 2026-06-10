package com.coffee.apigateway.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import com.coffee.apigateway.config.RouteProperties;
    import jakarta.servlet.http.HttpServletRequest;
    import jakarta.servlet.ServletException;
    import jakarta.servlet.http.Part;
    import java.io.IOException;
    import java.net.URI;
    import java.net.http.HttpClient;
    import java.util.Collections;
    import java.util.Locale;
    import java.util.Set;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.core.io.ByteArrayResource;
    import org.springframework.http.HttpStatus;
    import org.springframework.http.HttpEntity;
    import org.springframework.http.HttpHeaders;
    import org.springframework.http.HttpMethod;
    import org.springframework.http.MediaType;
    import org.springframework.http.ResponseEntity;
    import org.springframework.http.client.JdkClientHttpRequestFactory;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;
    import org.springframework.web.client.HttpStatusCodeException;
    import org.springframework.web.client.RestTemplate;
    import org.springframework.util.LinkedMultiValueMap;
    import org.springframework.util.MultiValueMap;
    import org.springframework.util.StreamUtils;
    import org.springframework.web.util.UriComponentsBuilder;

    @RestController
    public class GatewayProxyController {
        private final RouteProperties routeProperties;
        private final RestTemplate restTemplate;
        private final String customerFrontendUrl;

        public GatewayProxyController(RouteProperties routeProperties,
                                      @Value("${app.frontend.customer-url:http://localhost:5181}") String customerFrontendUrl) {
            this.routeProperties = routeProperties;
            this.restTemplate = new RestTemplate(new JdkClientHttpRequestFactory(HttpClient.newHttpClient()));
            this.customerFrontendUrl = customerFrontendUrl;
        }

        @RequestMapping("/api/**")
        public ResponseEntity<?> proxy(HttpServletRequest request) throws IOException, ServletException {
            String service = resolveService(request.getRequestURI());
            String baseUrl = routeProperties.getRoutes().get(service);
            if (baseUrl == null) {
                throw new BadRequestException("No route configured for " + service);
            }
            URI uri = UriComponentsBuilder.fromHttpUrl(baseUrl)
                    .path(request.getRequestURI())
                    .query(request.getQueryString())
                    .build(true)
                    .toUri();
            if (isMultipart(request)) {
                return proxyMultipart(request, uri);
            }

            HttpHeaders headers = forwardedHeaders(request, false);
            byte[] body = StreamUtils.copyToByteArray(request.getInputStream());
            HttpEntity<byte[]> entity = new HttpEntity<>(body, headers);
            try {
                ResponseEntity<byte[]> response = restTemplate.exchange(uri, HttpMethod.valueOf(request.getMethod()), entity, byte[].class);
                return new ResponseEntity<>(response.getBody(), sanitizedHeaders(response.getHeaders()), response.getStatusCode());
            } catch (HttpStatusCodeException ex) {
                return new ResponseEntity<>(ex.getResponseBodyAsByteArray(), sanitizedHeaders(ex.getResponseHeaders()), ex.getStatusCode());
            }
        }

        @RequestMapping("/")
        public ApiResponse<String> root() {
            return ApiResponse.success("Coffee Chain API Gateway is running. Use /api/** or /swagger-ui.html.");
        }

        @GetMapping("/payment-return")
        public ResponseEntity<Void> paymentReturn(HttpServletRequest request) {
            URI redirectUri = UriComponentsBuilder.fromHttpUrl(customerFrontendUrl)
                    .path("/payment-return")
                    .query(request.getQueryString())
                    .build(true)
                    .toUri();
            return ResponseEntity.status(HttpStatus.FOUND).location(redirectUri).build();
        }

        private String resolveService(String path) {
            if (path.startsWith("/api/auth")) return "auth-service";
            if (path.startsWith("/api/branches") || path.startsWith("/api/work-schedules")) return "branch-service";
            if (path.startsWith("/api/products") || path.startsWith("/api/product-categories")) return "product-service";
            if (path.startsWith("/api/ingredients") || path.startsWith("/api/ingredient-categories") || path.startsWith("/api/suppliers")) return "inventory-service";
            if (path.startsWith("/api/customers")) return "customer-service";
            if (path.startsWith("/api/payments")) return "order-service";
            if (path.startsWith("/api/orders")) return "order-service";
            if (path.startsWith("/api/promotions")) return "promotion-service";
            if (path.startsWith("/api/lookups") || path.startsWith("/api/employees") || path.startsWith("/api/managers")) return "user-service";
            if (path.startsWith("/api/content")) return "content-service";
            if (path.startsWith("/api/upload")) return "content-service";
            if (path.startsWith("/api/admin/users")) return "user-service";
            if (path.startsWith("/api/admin/branches") || path.startsWith("/api/admin/work-schedules")) return "branch-service";
            if (path.startsWith("/api/admin/products")) return "product-service";
            if (path.startsWith("/api/admin/inventory")) return "inventory-service";
            if (path.startsWith("/api/admin/orders")) return "order-service";
            if (path.startsWith("/api/admin/customers")) return "customer-service";
            if (path.startsWith("/api/admin/promotions")) return "promotion-service";
            if (path.startsWith("/api/admin/content")) return "content-service";
            if (path.startsWith("/api/admin/reports")) return "report-service";
            if (path.startsWith("/api/admin/ai")) return "ai-service";
            if (path.startsWith("/api/ai")) return "ai-service";
            throw new BadRequestException("Unsupported gateway route: " + path);
        }

        private ResponseEntity<?> proxyMultipart(HttpServletRequest request, URI uri) throws IOException, ServletException {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            for (Part part : request.getParts()) {
                String fileName = part.getSubmittedFileName();
                byte[] bytes = StreamUtils.copyToByteArray(part.getInputStream());
                if (fileName == null) {
                    body.add(part.getName(), new String(bytes, request.getCharacterEncoding() == null ? "UTF-8" : request.getCharacterEncoding()));
                    continue;
                }
                body.add(part.getName(), new ByteArrayResource(bytes) {
                    @Override
                    public String getFilename() {
                        return fileName;
                    }
                });
            }

            HttpHeaders headers = forwardedHeaders(request, true);
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            try {
                ResponseEntity<byte[]> response = restTemplate.exchange(uri, HttpMethod.valueOf(request.getMethod()), entity, byte[].class);
                return new ResponseEntity<>(response.getBody(), sanitizedHeaders(response.getHeaders()), response.getStatusCode());
            } catch (HttpStatusCodeException ex) {
                return new ResponseEntity<>(ex.getResponseBodyAsByteArray(), sanitizedHeaders(ex.getResponseHeaders()), ex.getStatusCode());
            }
        }

        private HttpHeaders forwardedHeaders(HttpServletRequest request, boolean skipContentType) {
            HttpHeaders headers = new HttpHeaders();
            Collections.list(request.getHeaderNames()).forEach(name -> {
                if (!isHopByHopHeader(name) && !(skipContentType && HttpHeaders.CONTENT_TYPE.equalsIgnoreCase(name))) {
                    headers.addAll(name, Collections.list(request.getHeaders(name)));
                }
            });
            return headers;
        }

        private boolean isMultipart(HttpServletRequest request) {
            String contentType = request.getContentType();
            return contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith(MediaType.MULTIPART_FORM_DATA_VALUE);
        }

        private HttpHeaders sanitizedHeaders(HttpHeaders source) {
            HttpHeaders headers = new HttpHeaders();
            if (source == null) {
                return headers;
            }
            source.forEach((name, values) -> {
                if (!isHopByHopHeader(name)) {
                    headers.addAll(name, values);
                }
            });
            return headers;
        }

        private boolean isHopByHopHeader(String name) {
            return Set.of("connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
                            "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length",
                            "origin", "access-control-request-method", "access-control-request-headers")
                    .contains(name.toLowerCase());
        }
    }
