package com.coffee.aiservice.controller;

import com.coffee.aiservice.service.RoleAssistantService;
import com.coffee.aiservice.service.RoleAssistantService.AssistantRequest;
import com.coffee.aiservice.service.RoleAssistantService.AssistantResponse;
import com.coffee.common.response.ApiResponse;
import com.coffee.common.security.AuthenticatedUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/assistant")
@PreAuthorize("hasAnyRole('admin','branch_manager','warehouse_manager','warehouse_staff','sales_staff','sale_staff','delivery_staff')")
public class RoleAssistantController {
    private final RoleAssistantService roleAssistantService;

    public RoleAssistantController(RoleAssistantService roleAssistantService) {
        this.roleAssistantService = roleAssistantService;
    }

    @PostMapping("/chat")
    public ApiResponse<AssistantResponse> chat(@RequestBody AssistantRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.success(roleAssistantService.chat(request, user));
    }
}
