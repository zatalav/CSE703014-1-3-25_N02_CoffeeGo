package com.coffee.contentservice.service.impl;

import com.coffee.common.exception.BadRequestException;
import com.coffee.contentservice.config.CloudinaryProperties;
import com.coffee.contentservice.dto.response.FileUploadResponse;
import com.coffee.contentservice.service.FileStorageService;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CloudinaryFileStorageService implements FileStorageService {
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final CloudinaryProperties properties;
    private final Path localUploadDirectory;
    private final RestTemplate restTemplate = new RestTemplate();

    public CloudinaryFileStorageService(
            CloudinaryProperties properties,
            @Value("${app.upload.local-dir:uploads}") String localUploadDirectory) {
        this.properties = properties;
        this.localUploadDirectory = Path.of(localUploadDirectory).toAbsolutePath().normalize();
    }

    @Override
    public FileUploadResponse uploadImage(MultipartFile file) {
        validateFile(file);
        if (!hasCloudinaryConfig()) {
            return uploadLocal(file);
        }
        validateCloudinaryConfig();

        long timestamp = Instant.now().getEpochSecond();
        String publicId = "image-" + UUID.randomUUID();
        Map<String, String> signedParams = new LinkedHashMap<>();
        if (StringUtils.hasText(properties.getFolder())) {
            signedParams.put("folder", properties.getFolder());
        }
        signedParams.put("public_id", publicId);
        signedParams.put("timestamp", String.valueOf(timestamp));

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource(file));
        body.add("api_key", cloudinaryApiKey());
        body.add("public_id", publicId);
        body.add("timestamp", String.valueOf(timestamp));
        if (StringUtils.hasText(properties.getFolder())) {
            body.add("folder", properties.getFolder());
        }
        body.add("signature", signature(signedParams));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        String uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudinaryCloudName() + "/image/upload";
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(uploadUrl, new HttpEntity<>(body, headers), Map.class);
            Map<?, ?> payload = response.getBody();
            if (payload == null || payload.get("secure_url") == null) {
                throw new BadRequestException("Cloudinary upload did not return an image URL");
            }
            return toResponse(payload);
        } catch (RestClientException ex) {
            throw new BadRequestException("Cloudinary upload failed: " + ex.getMessage());
        }
    }

    private FileUploadResponse uploadLocal(MultipartFile file) {
        try {
            Files.createDirectories(localUploadDirectory);
            String extension = extensionFor(file.getContentType());
            String fileName = "image-" + UUID.randomUUID() + extension;
            Path target = localUploadDirectory.resolve(fileName).normalize();
            if (!target.startsWith(localUploadDirectory)) {
                throw new BadRequestException("Invalid image filename");
            }
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            FileUploadResponse response = new FileUploadResponse();
            String url = "/api/upload/files/" + fileName;
            response.setImgUrl(url);
            response.setSecureUrl(url);
            response.setPublicId(fileName);
            response.setFormat(extension.replace(".", ""));
            response.setResourceType("image");
            response.setBytes(file.getSize());
            return response;
        } catch (IOException ex) {
            throw new BadRequestException("Cannot save image locally: " + ex.getMessage());
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("Only JPG, PNG, and WEBP images are accepted");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BadRequestException("Maximum image size is 5MB");
        }
    }

    private void validateCloudinaryConfig() {
        if (!hasCloudinaryConfig()) {
            throw new BadRequestException("Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
        }
    }

    private boolean hasCloudinaryConfig() {
        return StringUtils.hasText(cloudinaryCloudName())
                && StringUtils.hasText(cloudinaryApiKey())
                && StringUtils.hasText(cloudinaryApiSecret());
    }

    private String extensionFor(String contentType) {
        return switch (contentType == null ? "" : contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private String cloudinaryCloudName() {
        if (StringUtils.hasText(properties.getCloudName())) {
            return properties.getCloudName();
        }
        CloudinaryUrlParts parts = parseCloudinaryUrl();
        return parts == null ? "" : parts.cloudName();
    }

    private String cloudinaryApiKey() {
        if (StringUtils.hasText(properties.getApiKey())) {
            return properties.getApiKey();
        }
        CloudinaryUrlParts parts = parseCloudinaryUrl();
        return parts == null ? "" : parts.apiKey();
    }

    private String cloudinaryApiSecret() {
        if (StringUtils.hasText(properties.getApiSecret())) {
            return properties.getApiSecret();
        }
        CloudinaryUrlParts parts = parseCloudinaryUrl();
        return parts == null ? "" : parts.apiSecret();
    }

    private CloudinaryUrlParts parseCloudinaryUrl() {
        if (!StringUtils.hasText(properties.getUrl())) {
            return null;
        }
        try {
            URI uri = URI.create(properties.getUrl());
            String[] auth = (uri.getUserInfo() == null ? "" : uri.getUserInfo()).split(":", 2);
            if (auth.length != 2 || !StringUtils.hasText(uri.getHost())) {
                return null;
            }
            return new CloudinaryUrlParts(
                    URLDecoder.decode(auth[0], StandardCharsets.UTF_8),
                    URLDecoder.decode(auth[1], StandardCharsets.UTF_8),
                    uri.getHost()
            );
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private ByteArrayResource fileResource(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            return new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "image";
                }
            };
        } catch (IOException ex) {
            throw new BadRequestException("Cannot read image file");
        }
    }

    private String signature(Map<String, String> params) {
        StringBuilder source = new StringBuilder();
        params.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> {
                    if (source.length() > 0) {
                        source.append('&');
                    }
                    source.append(entry.getKey()).append('=').append(entry.getValue());
                });
        source.append(cloudinaryApiSecret());
        return sha1(source.toString());
    }

    private String sha1(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte item : hash) {
                hex.append(String.format("%02x", item));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-1 algorithm is not available", ex);
        }
    }

    private FileUploadResponse toResponse(Map<?, ?> payload) {
        FileUploadResponse response = new FileUploadResponse();
        String secureUrl = stringValue(payload.get("secure_url"));
        response.setImgUrl(secureUrl);
        response.setSecureUrl(secureUrl);
        response.setPublicId(stringValue(payload.get("public_id")));
        response.setFormat(stringValue(payload.get("format")));
        response.setResourceType(stringValue(payload.get("resource_type")));
        response.setBytes(longValue(payload.get("bytes")));
        response.setWidth(integerValue(payload.get("width")));
        response.setHeight(integerValue(payload.get("height")));
        return response;
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private Long longValue(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private Integer integerValue(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    private record CloudinaryUrlParts(String apiKey, String apiSecret, String cloudName) {
    }
}
