package com.coffee.productservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.productservice.dto.response.IngredientResponse;
import com.coffee.productservice.service.ToppingAdminService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products/toppings")
public class ToppingController {
    private final ToppingAdminService service;
    private final JdbcTemplate jdbcTemplate;

    public ToppingController(ToppingAdminService service, JdbcTemplate jdbcTemplate) {
        this.service = service;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ApiResponse<PageResponse<IngredientResponse>> list(@RequestParam Map<String, String> params,
                                                               @PageableDefault(size = 100) Pageable pageable) {
        Map<String, String> filters = new HashMap<>(params);
        String keyword = filters.remove("keyword");
        filters.remove("page");
        filters.remove("size");
        filters.remove("sort");
        Long toppingCategoryId = toppingCategoryId();
        if (toppingCategoryId != null) {
            filters.put("categoryId", String.valueOf(toppingCategoryId));
        }
        return ApiResponse.success(service.list(keyword, filters, pageable));
    }

    private Long toppingCategoryId() {
        return jdbcTemplate.queryForList(
                """
                SELECT i_category_id
                FROM Ingredient_category
                WHERE LOWER(i_category_name) = 'topping'
                ORDER BY i_category_id ASC
                LIMIT 1
                """,
                Long.class
        ).stream().findFirst().orElse(null);
    }
}
