package com.coffee.productservice.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ProductSchemaInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public ProductSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        addColumnIfMissing("Combo", "img_url", "VARCHAR(255) NULL");
        addColumnIfMissing("Ingredient", "topping_price", "BIGINT NULL");
        backfillToppingPrices();
        deactivateFoodProductSizes();
    }

    private void backfillToppingPrices() {
        jdbcTemplate.update("""
                UPDATE Ingredient i
                SET topping_price = CASE
                    WHEN LOWER(i.ingredient_name) LIKE '%kem cheese%'
                      OR LOWER(i.ingredient_name) LIKE '%cream cheese%'
                      OR LOWER(i.ingredient_name) LIKE '%foam%'
                      OR LOWER(i.ingredient_name) LIKE '%macchiato%' THEN 10000
                    WHEN LOWER(i.ingredient_name) LIKE '%pudding%'
                      OR LOWER(i.ingredient_name) LIKE '%flan%' THEN 8000
                    WHEN LOWER(i.ingredient_name) LIKE '%tran chau%'
                      OR LOWER(i.ingredient_name) LIKE '%trân châu%'
                      OR LOWER(i.ingredient_name) LIKE '%boba%'
                      OR LOWER(i.ingredient_name) LIKE '%pearl%' THEN 7000
                    WHEN LOWER(i.ingredient_name) LIKE '%nha dam%'
                      OR LOWER(i.ingredient_name) LIKE '%nha đam%'
                      OR LOWER(i.ingredient_name) LIKE '%aloe%'
                      OR LOWER(i.ingredient_name) LIKE '%duong den%'
                      OR LOWER(i.ingredient_name) LIKE '%đường đen%'
                      OR LOWER(i.ingredient_name) LIKE '%caramel%' THEN 6000
                    ELSE 5000
                END
                FROM Ingredient_category c
                WHERE LOWER(c.i_category_name) = 'topping'
                  AND c.i_category_id = i.i_category_id
                  AND i.topping_price IS NULL
                """);
    }

    private void addColumnIfMissing(String tableName, String columnName, String definition) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = CURRENT_SCHEMA()
                  AND LOWER(TABLE_NAME) = LOWER(?)
                  AND LOWER(COLUMN_NAME) = LOWER(?)
                """, Integer.class, tableName, columnName);
        if (count == null || count == 0) {
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
        }
    }

    private void deactivateFoodProductSizes() {
        jdbcTemplate.update("""
                UPDATE Product_size ps
                SET status = 'inactive'
                FROM Product p
                LEFT JOIN Product_category c ON c.p_category_id = p.p_category_id
                WHERE COALESCE(LOWER(ps.status), '') <> 'inactive'
                  AND p.product_id = ps.product_id
                  AND (
                    LOWER(COALESCE(p.product_type, '')) IN ('cake', 'bakery', 'pastry', 'snack', 'food')
                    OR LOWER(COALESCE(p.product_name, '')) LIKE '%banh%'
                    OR LOWER(COALESCE(p.product_name, '')) LIKE '%cake%'
                    OR LOWER(COALESCE(p.product_name, '')) LIKE '%bakery%'
                    OR LOWER(COALESCE(p.product_name, '')) LIKE '%pastry%'
                    OR LOWER(COALESCE(p.product_name, '')) LIKE '%croissant%'
                    OR LOWER(COALESCE(c.p_category_name, '')) LIKE '%banh%'
                    OR LOWER(COALESCE(c.p_category_name, '')) LIKE '%snack%'
                    OR LOWER(COALESCE(c.p_category_name, '')) LIKE '%cake%'
                    OR LOWER(COALESCE(c.p_category_name, '')) LIKE '%bakery%'
                    OR LOWER(COALESCE(c.p_category_name, '')) LIKE '%pastry%'
                    OR LOWER(COALESCE(c.p_category_name, '')) LIKE '%food%'
                  )
                """);
    }
}
