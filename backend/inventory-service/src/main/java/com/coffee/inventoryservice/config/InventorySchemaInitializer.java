package com.coffee.inventoryservice.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InventorySchemaInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public InventorySchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        createRestockTables();
        addColumnIfMissing("Ingredient", "topping_price", "BIGINT NULL");
        backfillToppingPrices();
    }

    private void createRestockTables() {
        createTableIfMissing("Restock_request", """
                CREATE TABLE Restock_request (
                    request_id BIGINT NOT NULL AUTO_INCREMENT,
                    branch_id BIGINT NOT NULL,
                    employee_id BIGINT NOT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'pending',
                    note TEXT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NULL,
                    PRIMARY KEY (request_id),
                    INDEX idx_restock_request_branch_status (branch_id, status),
                    INDEX idx_restock_request_created_at (created_at)
                )
                """);
        createTableIfMissing("Restock_request_detail", """
                CREATE TABLE Restock_request_detail (
                    request_detail_id BIGINT NOT NULL AUTO_INCREMENT,
                    request_id BIGINT NOT NULL,
                    ingredient_id BIGINT NOT NULL,
                    quantity DOUBLE NOT NULL,
                    unit VARCHAR(64) NOT NULL,
                    current_quantity DOUBLE NULL,
                    min_quantity DOUBLE NULL,
                    PRIMARY KEY (request_detail_id),
                    INDEX idx_restock_request_detail_request (request_id),
                    INDEX idx_restock_request_detail_ingredient (ingredient_id)
                )
                """);
    }

    private void backfillToppingPrices() {
        jdbcTemplate.update("""
                UPDATE Ingredient i
                JOIN Ingredient_category c ON c.i_category_id = i.i_category_id
                SET i.topping_price = CASE
                    WHEN LOWER(i.ingredient_name) LIKE '%kem cheese%'
                      OR LOWER(i.ingredient_name) LIKE '%cream cheese%'
                      OR LOWER(i.ingredient_name) LIKE '%foam%'
                      OR LOWER(i.ingredient_name) LIKE '%macchiato%' THEN 10000
                    WHEN LOWER(i.ingredient_name) LIKE '%pudding%'
                      OR LOWER(i.ingredient_name) LIKE '%flan%' THEN 8000
                    WHEN LOWER(i.ingredient_name) LIKE '%tran chau%'
                      OR LOWER(i.ingredient_name) LIKE '%boba%'
                      OR LOWER(i.ingredient_name) LIKE '%pearl%' THEN 7000
                    WHEN LOWER(i.ingredient_name) LIKE '%nha dam%'
                      OR LOWER(i.ingredient_name) LIKE '%aloe%'
                      OR LOWER(i.ingredient_name) LIKE '%duong den%'
                      OR LOWER(i.ingredient_name) LIKE '%caramel%' THEN 6000
                    ELSE 5000
                END
                WHERE LOWER(c.i_category_name) = 'topping'
                  AND i.topping_price IS NULL
                """);
    }

    private void addColumnIfMissing(String tableName, String columnName, String definition) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                """, Integer.class, tableName, columnName);
        if (count == null || count == 0) {
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
        }
    }

    private void createTableIfMissing(String tableName, String sql) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                """, Integer.class, tableName);
        if (count == null || count == 0) {
            jdbcTemplate.execute(sql);
        }
    }
}
