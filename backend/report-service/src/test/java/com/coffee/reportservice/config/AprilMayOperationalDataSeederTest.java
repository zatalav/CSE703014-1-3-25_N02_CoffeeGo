package com.coffee.reportservice.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class AprilMayOperationalDataSeederTest {

    @Test
    void seedsAprilMayOperationalDataIntoConfiguredDatabase() {
        assumeTrue(Boolean.getBoolean("runAprilMaySeed"), "Enable with -DrunAprilMaySeed=true");
        assumeTrue(hasText(System.getenv("DB_URL")), "DB_URL is required");
        assumeTrue(hasText(System.getenv("DB_USERNAME")), "DB_USERNAME is required");

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(System.getenv("DB_URL"));
        dataSource.setUsername(System.getenv("DB_USERNAME"));
        dataSource.setPassword(System.getenv("DB_PASSWORD"));

        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        new AprilMayOperationalDataSeeder(jdbcTemplate, true).run(null);

        assertEquals(10, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Product
                WHERE product_type IN ('phin','espresso','cold_brew','fruit_tea','milk_tea',
                                       'ice_blended','smoothie','juice','bakery','snack')
                """));
        assertEquals(10, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Combo
                WHERE start_date = '2026-04-01'
                  AND end_date = '2026-05-31'
                  AND combo_name LIKE 'Combo %'
                """));
        assertTrue(count(jdbcTemplate, "SELECT COUNT(*) FROM Recipe_detail") >= 90);
        assertTrue(count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Ingredient
                WHERE status = 'active'
                """) >= 20);
        assertTrue(count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Employee e
                JOIN Role r ON r.role_id = e.role_id
                WHERE r.role_name IN ('Admin','Branch Manager','Sales Staff','Warehouse Manager',
                                      'Warehouse Staff','Delivery Staff')
                """) >= 15);
        assertEquals(61, count(jdbcTemplate, """
                SELECT COUNT(DISTINCT DATE(created_at))
                FROM Order_
                WHERE DATE(created_at) BETWEEN '2026-04-01' AND '2026-05-31'
                  AND note LIKE 'Seed code: AM2026-ORDER-%'
                """));
        assertTrue(count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Order_
                WHERE DATE(created_at) BETWEEN '2026-04-01' AND '2026-05-31'
                  AND note LIKE 'Seed code: AM2026-ORDER-%'
                """) >= 500);
        assertTrue(count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Order_
                WHERE order_type = 'delivery'
                  AND status IN ('confirmed','delivering')
                  AND note LIKE 'Seed code: AM2026-ORDER-%'
                """) >= 3);
        assertTrue(count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Stock_import
                WHERE imported_at BETWEEN '2026-04-01' AND '2026-05-31 23:59:59'
                  AND note LIKE 'Seed code: AM2026-IMPORT-%'
                """) >= 8);
        assertTrue(count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Stock_export
                WHERE exported_at BETWEEN '2026-04-01' AND '2026-05-31 23:59:59'
                  AND note LIKE 'Seed code: AM2026-EXPORT-%'
                """) >= 6);
    }

    private static long count(JdbcTemplate jdbcTemplate, String sql) {
        Number value = jdbcTemplate.queryForObject(sql, Number.class);
        return value == null ? 0L : value.longValue();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
