package com.coffee.aiservice.controller;

import com.coffee.aiservice.service.CustomerAssistantService;
import com.coffee.aiservice.service.CustomerAssistantService.CustomerAssistantRequest;
import com.coffee.aiservice.service.CustomerAssistantService.CustomerAssistantResponse;
import com.coffee.common.response.ApiResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/customer")
public class CustomerAssistantController {
    private final CustomerAssistantService customerAssistantService;

    public CustomerAssistantController(CustomerAssistantService customerAssistantService) {
        this.customerAssistantService = customerAssistantService;
    }

    @PostMapping("/chat")
    public ApiResponse<CustomerAssistantResponse> chat(@RequestBody CustomerAssistantRequest request) {
        return ApiResponse.success(customerAssistantService.chat(request));
    }
}
