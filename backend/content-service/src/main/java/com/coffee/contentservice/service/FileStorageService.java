package com.coffee.contentservice.service;

import com.coffee.contentservice.dto.response.FileUploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    FileUploadResponse uploadImage(MultipartFile file);
}
