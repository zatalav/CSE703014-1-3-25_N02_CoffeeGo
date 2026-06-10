package com.coffee.aiservice.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.coffee.aiservice.service.RoleAssistantService.AssistantRequest;
import com.coffee.aiservice.service.RoleAssistantService.AssistantResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class RoleAssistantServiceTest {
    @Test
    void adminRuleBasedAnswerSummarizesSnapshotWithoutRawJsonDump() {
        JdbcTemplate jdbcTemplate = mockJdbcTemplate();
        RoleAssistantService service = service(jdbcTemplate);

        AssistantResponse response = service.chat(request("Trang Admin dang co gi?"),
                new AuthenticatedUser(4L, "admin", null));

        assertEquals("admin", response.role);
        assertEquals("rule_based", response.provider);
        assertTrue(response.context.containsKey("metrics"));
        assertTrue(response.context.containsKey("lowStock"));
        assertTrue(response.answer.contains("Tóm tắt dữ liệu hiện có"));
        assertTrue(response.answer.contains("Đang xử lý"));
        assertFalse(response.answer.contains("\"metrics\""));
        assertFalse(response.answer.contains("\"recentOrders\""));
    }

    @Test
    void branchManagerReceivesBranchScopedOperationalData() {
        JdbcTemplate jdbcTemplate = mockJdbcTemplate();
        RoleAssistantService service = service(jdbcTemplate);

        AssistantResponse response = service.chat(request("Don nao can xu ly truoc?"),
                new AuthenticatedUser(10L, "branch_manager", 2L));

        assertEquals("branch_manager", response.role);
        assertEquals("rule_based", response.provider);
        assertTrue(response.context.containsKey("orderMetrics"));
        assertTrue(response.context.containsKey("recentOrders"));
        assertTrue(response.context.containsKey("topProductsToday"));
        assertFalse(response.context.containsKey("scopeWarning"));
        verify(jdbcTemplate, atLeastOnce()).queryForObject(contains("branch_id = ?"), eq(Long.class), any(Object[].class));
    }

    @Test
    void branchScopedRoleWithoutBranchIdDoesNotLoadSensitiveData() {
        JdbcTemplate jdbcTemplate = mockJdbcTemplate();
        RoleAssistantService service = service(jdbcTemplate);

        AssistantResponse response = service.chat(request("Bao cao don hang"),
                new AuthenticatedUser(11L, "sales_staff", null));

        assertEquals("sales_staff", response.role);
        assertTrue(response.context.containsKey("scopeWarning"));
        assertFalse(response.context.containsKey("orderMetrics"));
        assertFalse(response.context.containsKey("recentOrders"));
        verify(jdbcTemplate, never()).queryForObject(contains("Order_"), eq(Long.class), any(Object[].class));
    }

    @Test
    void warehouseManagerReceivesInventoryData() {
        JdbcTemplate jdbcTemplate = mockJdbcTemplate();
        RoleAssistantService service = service(jdbcTemplate);

        AssistantResponse response = service.chat(request("Nguyen lieu nao sap het?"),
                new AuthenticatedUser(12L, "warehouse_manager", 3L));

        assertEquals("warehouse_manager", response.role);
        assertTrue(response.context.containsKey("warehouseMetrics"));
        assertTrue(response.context.containsKey("lowStock"));
        assertTrue(response.context.containsKey("recentImports"));
        assertTrue(response.context.containsKey("ingredientCategories"));
    }

    @Test
    void branchStaffUsesSalesAssistantScope() {
        JdbcTemplate jdbcTemplate = mockJdbcTemplate();
        RoleAssistantService service = service(jdbcTemplate);

        AssistantResponse response = service.chat(request("Don nao can xu ly truoc?"),
                new AuthenticatedUser(13L, "Branch Staff", 1L));

        assertEquals("sales_staff", response.role);
        assertTrue(response.context.containsKey("orderMetrics"));
        assertTrue(response.context.containsKey("recentOrders"));
    }

    @Test
    void warehouseStaffReceivesInventoryData() {
        JdbcTemplate jdbcTemplate = mockJdbcTemplate();
        RoleAssistantService service = service(jdbcTemplate);

        AssistantResponse response = service.chat(request("Ton kho thap?"),
                new AuthenticatedUser(14L, "Warehouse Staff", 1L));

        assertEquals("warehouse_staff", response.role);
        assertTrue(response.context.containsKey("warehouseMetrics"));
        assertTrue(response.context.containsKey("lowStock"));
        assertTrue(response.context.containsKey("recentImports"));
        assertTrue(response.context.containsKey("ingredientCategories"));
    }

    private JdbcTemplate mockJdbcTemplate() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        doReturn(2L).when(jdbcTemplate).queryForObject(anyString(), eq(Long.class), any(Object[].class));
        doReturn(List.of(Map.of("id", 1L, "name", "Sample"))).when(jdbcTemplate).queryForList(anyString(), any(Object[].class));
        return jdbcTemplate;
    }

    private RoleAssistantService service(JdbcTemplate jdbcTemplate) {
        return new RoleAssistantService(jdbcTemplate, new ObjectMapper(),
                "https://api.openai.com/v1/chat/completions", "", "gpt-4o-mini");
    }

    private AssistantRequest request(String message) {
        AssistantRequest request = new AssistantRequest();
        request.message = message;
        return request;
    }
}
