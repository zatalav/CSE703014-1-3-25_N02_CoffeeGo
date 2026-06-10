package com.coffee.aiservice.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.coffee.aiservice.service.CustomerAssistantService.CustomerAssistantRequest;
import com.coffee.aiservice.service.CustomerAssistantService.CustomerAssistantResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class CustomerAssistantServiceTest {
    @Test
    void socialQuestionDoesNotQueryDatabase() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        CustomerAssistantService service = service(jdbcTemplate);

        CustomerAssistantResponse response = service.chat(request("Xin chào"));

        assertEquals("rule_based", response.provider);
        assertTrue(response.answer.contains("Chào bạn"));
        assertTrue(response.database.isEmpty());
        verify(jdbcTemplate, never()).queryForList(anyString(), any(Object[].class));
    }

    @Test
    void productQuestionUsesDatabaseProductAndPrice() {
        JdbcTemplate jdbcTemplate = mockJdbcTemplate();
        CustomerAssistantService service = service(jdbcTemplate);

        CustomerAssistantResponse response = service.chat(request("Bạc xỉu giá bao nhiêu?"));

        assertEquals("rule_based", response.provider);
        assertTrue(response.answer.contains("Bạc xỉu"));
        assertTrue(response.answer.contains("35.000đ"));
        assertTrue(response.database.containsKey("products"));
        verify(jdbcTemplate, times(8)).queryForList(anyString(), any(Object[].class));
    }

    @Test
    void unknownProductUsesNoDataTemplateAndDatabaseSuggestions() {
        CustomerAssistantService service = service(mockJdbcTemplate());

        CustomerAssistantResponse response = service.chat(request("CoffeeGo có matcha latte không?"));

        assertTrue(response.answer.contains("Xin lỗi bạn"));
        assertTrue(response.answer.contains("chưa có"));
        assertTrue(response.answer.contains("Bạn muốn thử món nào"));
        assertTrue(response.answer.contains("Bạc xỉu") || response.answer.contains("Trà đào"));
        assertFalse(response.answer.contains("vxcff"));
        assertFalse(response.answer.contains("3.000.000"));
    }

    @Test
    void outsideScopeQuestionRedirectsToCoffeeTopic() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        CustomerAssistantService service = service(jdbcTemplate);

        CustomerAssistantResponse response = service.chat(request("Hôm nay thời tiết Hà Nội thế nào?"));

        assertTrue(response.answer.contains("ngoài tầm"));
        assertTrue(response.answer.contains("menu"));
        verify(jdbcTemplate, never()).queryForList(anyString(), any(Object[].class));
    }

    @Test
    void seasonalQuestionUsesSeasonalProductsContext() {
        CustomerAssistantService service = service(mockJdbcTemplate());

        CustomerAssistantResponse response = service.chat(request("CoffeeGo co san pham mua nao?"));

        assertTrue(response.database.containsKey("seasonalProducts"));
        assertTrue(response.answer.contains("Tra vai mua he"));
    }

    @Test
    void comboQuestionUsesComboContext() {
        CustomerAssistantService service = service(mockJdbcTemplate());

        CustomerAssistantResponse response = service.chat(request("Co combo nao dang ban khong?"));

        assertTrue(response.database.containsKey("combos"));
        assertTrue(response.answer.contains("combo"));
        assertTrue(response.answer.contains("Combo sang tinh tao"));
        assertTrue(response.answer.contains("59.000"));
    }

    @Test
    void membershipQuestionUsesMembershipRankContext() {
        CustomerAssistantService service = service(mockJdbcTemplate());

        CustomerAssistantResponse response = service.chat(request("CoffeeGo co cac hang thanh vien nao?"));

        assertTrue(response.database.containsKey("membershipRanks"));
        assertTrue(response.answer.contains("Gold"));
        assertTrue(response.answer.contains("Platinum"));
        assertTrue(response.answer.contains("300 EXP"));
    }

    @Test
    void membershipRankDetailQuestionFindsRankByName() {
        CustomerAssistantService service = service(mockJdbcTemplate());

        CustomerAssistantResponse response = service.chat(request("Quyen loi hang Platinum la gi?"));

        assertTrue(response.answer.contains("Platinum"));
        assertTrue(response.answer.contains("300 EXP"));
        assertTrue(response.answer.contains("Drips x1.1"));
        assertFalse(response.answer.contains("Xin"));
    }

    private JdbcTemplate mockJdbcTemplate() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        doAnswer(invocation -> {
            String sql = invocation.getArgument(0, String.class);
            if (sql.contains("Seasonal_product")) {
                return List.of(Map.of(
                        "productName", "Tra vai mua he",
                        "basePrice", 45000L,
                        "description", "Tra vai thanh mat",
                        "categoryName", "Tra",
                        "productType", "seasonal",
                        "seasonName", "He"
                ));
            }
            if (sql.contains("FROM Combo c")) {
                return List.of(Map.of(
                        "comboName", "Combo sang tinh tao",
                        "price", 59000L,
                        "description", "Ca phe da kem banh ngot",
                        "items", "Ca phe da x1, Banh ngot x1"
                ));
            }
            if (sql.contains("FROM Membership_rank")) {
                return List.of(
                        Map.of(
                                "rankName", "Gold",
                                "rankOrder", 1,
                                "minExp", 0,
                                "minTotalMoney", 0L,
                                "minTotalOrders", 0,
                                "discountPercent", 0,
                                "expMultiplier", 1.0,
                                "dripsMultiplier", 1.0,
                                "description", "Tich diem co ban"
                        ),
                        Map.of(
                                "rankName", "Platinum",
                                "rankOrder", 2,
                                "minExp", 300,
                                "minTotalMoney", 3000000L,
                                "minTotalOrders", 0,
                                "discountPercent", 0,
                                "expMultiplier", 1.0,
                                "dripsMultiplier", 1.1,
                                "description", "Them uu dai rieng cho thanh vien Platinum"
                        )
                );
            }
            if (sql.contains("FROM Product p")) {
                return List.of(
                        Map.of("productName", "Bạc xỉu", "basePrice", 35000L, "description", "Béo nhẹ, thơm cà phê", "categoryName", "Cà phê", "sizes", "M:0, L:5000"),
                        Map.of("productName", "Trà đào cam sả", "basePrice", 40000L, "description", "Trà trái cây thanh mát", "categoryName", "Trà"),
                        Map.of("productName", "vxcff", "basePrice", 3_000_000L, "description", "invalid", "categoryName", "Cà phê")
                );
            }
            if (sql.contains("FROM Coupon")) {
                return List.of(Map.of("code", "COFFEE10", "discountType", "percent", "discountValue", 10L, "description", "Giảm cho đơn hợp lệ"));
            }
            if (sql.contains("FROM News")) {
                return List.of();
            }
            if (sql.contains("FROM Branch")) {
                return List.of(Map.of("storeName", "CoffeeGo Quận 1", "address", "12 Nguyễn Huệ", "phone", "0900000000"));
            }
            return List.of();
        }).when(jdbcTemplate).queryForList(anyString(), any(Object[].class));
        return jdbcTemplate;
    }

    private CustomerAssistantService service(JdbcTemplate jdbcTemplate) {
        return new CustomerAssistantService(jdbcTemplate, new ObjectMapper(),
                "https://api.openai.com/v1/chat/completions", "", "gpt-4o-mini");
    }

    private CustomerAssistantRequest request(String message) {
        CustomerAssistantRequest request = new CustomerAssistantRequest();
        request.message = message;
        return request;
    }
}
