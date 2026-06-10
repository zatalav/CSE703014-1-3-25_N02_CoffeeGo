package com.coffee.contentservice.controller;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.contentservice.dto.response.FileUploadResponse;
    import com.coffee.contentservice.service.FileStorageService;
    import java.io.IOException;
    import java.net.MalformedURLException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.core.io.Resource;
    import org.springframework.core.io.UrlResource;
    import org.springframework.http.HttpHeaders;
    import org.springframework.http.MediaType;
    import org.springframework.http.ResponseEntity;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RequestParam;
    import org.springframework.web.bind.annotation.RestController;
    import org.springframework.web.multipart.MultipartFile;

    @RestController
    @RequestMapping({"/api/admin/content/upload", "/api/upload"})
    public class FileUploadController {
        private final FileStorageService fileStorageService;
        private final Path localUploadDirectory;

        public FileUploadController(
                FileStorageService fileStorageService,
                @Value("${app.upload.local-dir:uploads}") String localUploadDirectory) {
            this.fileStorageService = fileStorageService;
            this.localUploadDirectory = Path.of(localUploadDirectory).toAbsolutePath().normalize();
        }

        @PostMapping("/image")
        public ApiResponse<FileUploadResponse> upload(@RequestParam("file") MultipartFile file) {
            return ApiResponse.success(fileStorageService.uploadImage(file));
        }

        @GetMapping("/files/{fileName:.+}")
        public ResponseEntity<Resource> file(@PathVariable String fileName) throws IOException {
            Path file = localUploadDirectory.resolve(fileName).normalize();
            if (!file.startsWith(localUploadDirectory) || !Files.exists(file)) {
                return ResponseEntity.notFound().build();
            }

            try {
                Resource resource = new UrlResource(file.toUri());
                String contentType = Files.probeContentType(file);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType == null ? "application/octet-stream" : contentType))
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                        .body(resource);
            } catch (MalformedURLException ex) {
                return ResponseEntity.notFound().build();
            }
        }
    }
