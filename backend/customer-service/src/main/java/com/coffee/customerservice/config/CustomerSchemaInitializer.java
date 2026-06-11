package com.coffee.customerservice.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class CustomerSchemaInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public CustomerSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        addColumnIfMissing("Membership_rank", "color", "VARCHAR(20) NULL");
        addColumnIfMissing("Membership_rank", "icon", "VARCHAR(20) NULL");
        addColumnIfMissing("Customer_detail", "address_label", "VARCHAR(100) NULL");
        addColumnIfMissing("Customer_detail", "address_detail", "VARCHAR(255) NULL");
        addColumnIfMissing("Customer_detail", "address_ward", "VARCHAR(100) NULL");
        addColumnIfMissing("Customer_detail", "address_district", "VARCHAR(100) NULL");
        addColumnIfMissing("Customer_detail", "address_province", "VARCHAR(100) NULL");
        addColumnIfMissing("Customer_detail", "address_ward_code", "INT NULL");
        addColumnIfMissing("Customer_detail", "address_district_code", "INT NULL");
        addColumnIfMissing("Customer_detail", "address_province_code", "INT NULL");
        addColumnIfMissing("Customer_detail", "address_lat", "DOUBLE PRECISION NULL");
        addColumnIfMissing("Customer_detail", "address_lng", "DOUBLE PRECISION NULL");
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
}
