package com.coffee.reportservice.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class ActorFeatureSmokeTest {
    private final List<Long> orderIds = new ArrayList<>();
    private final List<Long> paymentIds = new ArrayList<>();
    private final List<Long> orderDetailIds = new ArrayList<>();
    private final List<Long> stockImportIds = new ArrayList<>();
    private final List<Long> stockImportDetailIds = new ArrayList<>();
    private final List<Long> stockExportIds = new ArrayList<>();
    private final List<Long> stockExportDetailIds = new ArrayList<>();
    private final List<Long> warehouseStockIds = new ArrayList<>();
    private final List<Long> warehouseLocationIds = new ArrayList<>();
    private final List<Long> supplierIds = new ArrayList<>();
    private final List<Long> comboIds = new ArrayList<>();
    private final List<Long> productIds = new ArrayList<>();
    private final List<Long> productSizeIds = new ArrayList<>();
    private final List<Long> recipeIds = new ArrayList<>();
    private final List<Long> recipeDetailIds = new ArrayList<>();
    private final List<Long> ingredientIds = new ArrayList<>();
    private final List<Long> productCategoryIds = new ArrayList<>();
    private final List<Long> ingredientCategoryIds = new ArrayList<>();
    private final List<Long> customerIds = new ArrayList<>();
    private final List<Long> employeeIds = new ArrayList<>();
    private final List<Long> branchIds = new ArrayList<>();

    @Test
    void coversAdminBranchSalesWarehouseDeliveryAndCustomerSmokeFlows() {
        assumeTrue(Boolean.getBoolean("runActorSmoke"), "Enable with -DrunActorSmoke=true");
        assumeTrue(hasText(System.getenv("DB_URL")), "DB_URL is required");
        assumeTrue(hasText(System.getenv("DB_USERNAME")), "DB_USERNAME is required");

        JdbcTemplate jdbcTemplate = jdbcTemplate();
        new AprilMayOperationalDataSeeder(jdbcTemplate, true).run(null);

        String code = "SMOKE" + System.currentTimeMillis();
        try {
            Baseline baseline = baseline(jdbcTemplate);
            SmokeData data = createSmokeData(jdbcTemplate, baseline, code);

            adminCanCreateUpdateSearchFilterAndDeleteDomainRows(jdbcTemplate, data, code);
            branchManagerCanFilterOwnBranchEmployeesAndOrders(jdbcTemplate, data);
            salesStaffCanPlaceAndProgressOrder(jdbcTemplate, data, code);
            warehouseActorsCanImportExportAndFilterStock(jdbcTemplate, data, code);
            deliveryStaffCanAcceptAndCompleteDeliveryOrder(jdbcTemplate, data, code);
            customerCanUpdateProfileSearchMenuAndPlaceDeliveryOrder(jdbcTemplate, data, code);
        } finally {
            cleanup(jdbcTemplate);
        }
    }

    private SmokeData createSmokeData(JdbcTemplate jdbcTemplate, Baseline baseline, String code) {
        Long branchId = insert(jdbcTemplate, """
                INSERT INTO Branch(branch_name, address, phone, email, branch_type, status, address_detail)
                VALUES (?, ?, ?, ?, 'sales', 'active', ?)
                """, "branch_id",
                "Smoke Branch " + code,
                "1 Smoke Street, Ho Chi Minh",
                "0909000000",
                "branch." + code.toLowerCase() + "@coffeego.local",
                "Temporary branch for actor smoke test");
        branchIds.add(branchId);

        Long productCategoryId = insert(jdbcTemplate,
                "INSERT INTO Product_category(p_category_name) VALUES (?)",
                "p_category_id",
                "Smoke Category " + code);
        productCategoryIds.add(productCategoryId);

        Long ingredientCategoryId = insert(jdbcTemplate,
                "INSERT INTO Ingredient_category(i_category_name) VALUES (?)",
                "i_category_id",
                "Smoke Ingredient Category " + code);
        ingredientCategoryIds.add(ingredientCategoryId);

        Long ingredientId = insert(jdbcTemplate, """
                INSERT INTO Ingredient(i_category_id, ingredient_name, unit, status)
                VALUES (?, ?, 'g', 'active')
                """, "ingredient_id", ingredientCategoryId, "Smoke Ingredient " + code);
        ingredientIds.add(ingredientId);

        Long productId = insert(jdbcTemplate, """
                INSERT INTO Product(p_category_id, product_name, description, base_price, product_type, status, created_at)
                VALUES (?, ?, ?, 47000, 'smoke', 'active', ?)
                """, "product_id",
                productCategoryId,
                "Smoke Latte " + code,
                "Temporary product for actor smoke test",
                LocalDateTime.now());
        productIds.add(productId);

        Long sizeId = insert(jdbcTemplate, """
                INSERT INTO Product_size(product_id, size, extra_price, status)
                VALUES (?, 'M', 0, 'active')
                """, "size_id", productId);
        productSizeIds.add(sizeId);

        Long recipeId = insert(jdbcTemplate,
                "INSERT INTO Recipe(product_id, recipe_name, description) VALUES (?, ?, ?)",
                "recipe_id",
                productId, "Smoke Recipe " + code, "Temporary recipe");
        recipeIds.add(recipeId);

        Long recipeDetailId = insert(jdbcTemplate, """
                INSERT INTO Recipe_detail(recipe_id, ingredient_id, quantity, unit, size, estimated_total)
                VALUES (?, ?, 18, 'g', 'M', 4500)
                """, "recipe_detail_id", recipeId, ingredientId);
        recipeDetailIds.add(recipeDetailId);

        Long comboId = insert(jdbcTemplate, """
                INSERT INTO Combo(combo_name, description, category, price, start_date, end_date, status)
                VALUES (?, ?, 'combo', 88000, ?, ?, 'active')
                """, "combo_id",
                "Smoke Combo " + code,
                "Temporary combo",
                LocalDate.now(),
                LocalDate.now().plusDays(14));
        comboIds.add(comboId);
        jdbcTemplate.update("INSERT INTO Combo_detail(combo_id, product_id, quantity) VALUES (?, ?, 2)", comboId, productId);

        Long locationId = insert(jdbcTemplate, """
                INSERT INTO Warehouse_location(branch_id, zone, shelf, slot)
                VALUES (?, 'S', 'SMOKE', ?)
                """, "location_id", branchId, code.substring(Math.max(0, code.length() - 8)));
        warehouseLocationIds.add(locationId);

        Long stockId = insert(jdbcTemplate, """
                INSERT INTO Warehouse_stock(ingredient_id, location_id, branch_id, quantity, min_quantity, unit)
                VALUES (?, ?, ?, 4, 10, 'g')
                """, "stock_id", ingredientId, locationId, branchId);
        warehouseStockIds.add(stockId);

        Long supplierId = insert(jdbcTemplate, """
                INSERT INTO Supplier(supplier_name, address, status, description)
                VALUES (?, ?, 'active', ?)
                """, "supplier_id",
                "Smoke Supplier " + code,
                "2 Smoke Supply Street",
                "Temporary supplier");
        supplierIds.add(supplierId);
        jdbcTemplate.update("""
                INSERT INTO Supplier_detail(supplier_id, contact_person, phone, email, delivery_time)
                VALUES (?, 'Smoke Contact', '0909000001', ?, 1)
                """, supplierId, "supplier." + code.toLowerCase() + "@coffeego.local");

        Long branchManagerId = insertEmployee(jdbcTemplate, baseline.branchManagerRoleId(), branchId,
                "Smoke Branch Manager " + code, "manager." + code.toLowerCase() + "@coffeego.local");
        Long salesStaffId = insertEmployee(jdbcTemplate, baseline.salesStaffRoleId(), branchId,
                "Smoke Sales Staff " + code, "sales." + code.toLowerCase() + "@coffeego.local");
        Long warehouseStaffId = insertEmployee(jdbcTemplate, baseline.warehouseStaffRoleId(), branchId,
                "Smoke Warehouse Staff " + code, "warehouse." + code.toLowerCase() + "@coffeego.local");
        Long deliveryStaffId = insertEmployee(jdbcTemplate, baseline.deliveryStaffRoleId(), branchId,
                "Smoke Delivery Staff " + code, "delivery." + code.toLowerCase() + "@coffeego.local");

        Long customerId = insert(jdbcTemplate, """
                INSERT INTO Customer(name, gender, date_of_birth, status, created_at)
                VALUES (?, 'female', ?, 'active', ?)
                """, "id",
                "Smoke Customer " + code,
                LocalDate.of(1998, 1, 1),
                LocalDateTime.now());
        customerIds.add(customerId);
        jdbcTemplate.update("""
                INSERT INTO Customer_detail(customer_id, email, phone_number, password, address, updated_at)
                VALUES (?, ?, '0919000000', ?, 'Smoke customer address', ?)
                """, customerId, "customer." + code.toLowerCase() + "@coffeego.local",
                "$2a$10$VfZkDdc0VTm1EqOkVUQLp.VhK2rUC6EUC7r5zhy5YEZcJWU16KMvW",
                LocalDateTime.now());
        jdbcTemplate.update("""
                INSERT INTO Customer_loyalty(customer_id, rank_id, exp_point, drips_point, total_money, total_orders, updated_at)
                VALUES (?, ?, 0, 0, 0, 0, ?)
                """, customerId, baseline.rankId(), LocalDateTime.now());

        Long transferBranchId = jdbcTemplate.queryForObject(
                "SELECT branch_id FROM Branch WHERE branch_id <> ? ORDER BY branch_id LIMIT 1",
                Long.class,
                branchId);

        return new SmokeData(
                branchId, productCategoryId, ingredientCategoryId, ingredientId, productId,
                sizeId, recipeId, comboId, locationId, stockId, supplierId,
                branchManagerId, salesStaffId, warehouseStaffId, deliveryStaffId, customerId,
                transferBranchId
        );
    }

    private void adminCanCreateUpdateSearchFilterAndDeleteDomainRows(JdbcTemplate jdbcTemplate, SmokeData data, String code) {
        jdbcTemplate.update("UPDATE Product SET base_price = ?, description = ? WHERE product_id = ?",
                49_000L, "Updated by admin smoke flow", data.productId());
        Map<String, Object> product = jdbcTemplate.queryForMap("""
                SELECT product_name, base_price, status
                FROM Product
                WHERE product_name LIKE ?
                  AND product_type = 'smoke'
                  AND status = 'active'
                """, "%Smoke Latte " + code + "%");
        assertEquals(49_000L, number(product.get("base_price")));

        Long deletedProductId = insert(jdbcTemplate, """
                INSERT INTO Product(p_category_id, product_name, description, base_price, product_type, status, created_at)
                VALUES (?, ?, ?, 25000, 'smoke-delete', 'active', ?)
                """, "product_id",
                data.productCategoryId(),
                "Smoke Deleted Product " + code,
                "Temporary product for delete smoke test",
                LocalDateTime.now());
        productIds.add(deletedProductId);
        jdbcTemplate.update("DELETE FROM Product WHERE product_id = ?", deletedProductId);
        assertEquals(0L, count(jdbcTemplate,
                "SELECT COUNT(*) FROM Product WHERE product_id = ?", deletedProductId));

        jdbcTemplate.update("UPDATE Branch SET status = 'inactive' WHERE branch_id = ?", data.branchId());
        assertEquals(1L, count(jdbcTemplate, "SELECT COUNT(*) FROM Branch WHERE branch_id = ? AND status = 'inactive'", data.branchId()));
        jdbcTemplate.update("UPDATE Branch SET status = 'active' WHERE branch_id = ?", data.branchId());

        assertEquals(1L, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Product p
                JOIN Product_category pc ON pc.p_category_id = p.p_category_id
                WHERE pc.p_category_name LIKE ?
                  AND p.product_type = 'smoke'
                """, "%Smoke Category%"));
    }

    private void branchManagerCanFilterOwnBranchEmployeesAndOrders(JdbcTemplate jdbcTemplate, SmokeData data) {
        Long orderId = insertOrder(jdbcTemplate, data.customerId(), data.branchManagerId(), data.branchId(),
                "dine-in", "pending", "Branch manager smoke order", LocalDateTime.now());
        insertPayment(jdbcTemplate, orderId, 49_000L, "pending", null);

        assertEquals(4L, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Employee
                WHERE branch_id = ?
                  AND status = 'active'
                """, data.branchId()));
        assertTrue(count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Order_
                WHERE branch_id = ?
                  AND status = 'pending'
                """, data.branchId()) >= 1);
    }

    private void salesStaffCanPlaceAndProgressOrder(JdbcTemplate jdbcTemplate, SmokeData data, String code) {
        Long orderId = insertOrder(jdbcTemplate, data.customerId(), data.salesStaffId(), data.branchId(),
                "dine-in", "pending", "Seed smoke sales order " + code, LocalDateTime.now());
        insertOrderDetail(jdbcTemplate, orderId, data.productId(), null, 2, 49_000L, data.sizeId());
        insertPayment(jdbcTemplate, orderId, 98_000L, "pending", null);

        assertEquals(1L, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Order_
                WHERE branch_id = ?
                  AND employee_id = ?
                  AND status = 'pending'
                  AND note LIKE ?
                """, data.branchId(), data.salesStaffId(), "%" + code + "%"));

        jdbcTemplate.update("UPDATE Order_ SET status = 'confirmed', updated_at = ? WHERE order_id = ?",
                LocalDateTime.now(), orderId);
        jdbcTemplate.update("UPDATE Order_ SET status = 'completed', updated_at = ? WHERE order_id = ?",
                LocalDateTime.now(), orderId);
        jdbcTemplate.update("UPDATE Payment SET status = 'paid', paid_at = ? WHERE order_id = ?",
                LocalDateTime.now(), orderId);

        assertEquals("completed", jdbcTemplate.queryForObject(
                "SELECT status FROM Order_ WHERE order_id = ?", String.class, orderId));
    }

    private void warehouseActorsCanImportExportAndFilterStock(JdbcTemplate jdbcTemplate, SmokeData data, String code) {
        Long importId = insert(jdbcTemplate, """
                INSERT INTO Stock_import(branch_id, supplier_id, employee_id, total_amount, note, imported_at)
                VALUES (?, ?, ?, 180000, ?, ?)
                """, "import_id",
                data.branchId(), data.supplierId(), data.warehouseStaffId(), "Smoke import " + code,
                LocalDateTime.now());
        stockImportIds.add(importId);
        Long importDetailId = insert(jdbcTemplate, """
                INSERT INTO Stock_import_detail(import_id, ingredient_id, quantity, unit, unit_price, expiry_date)
                VALUES (?, ?, 1000, 'g', 180, ?)
                """, "import_detail_id", importId, data.ingredientId(), LocalDate.now().plusMonths(6));
        stockImportDetailIds.add(importDetailId);

        jdbcTemplate.update("UPDATE Warehouse_stock SET quantity = quantity + 1000 WHERE stock_id = ?", data.stockId());
        assertTrue(number(jdbcTemplate.queryForMap("SELECT quantity FROM Warehouse_stock WHERE stock_id = ?", data.stockId()).get("quantity")) >= 1000L);

        Long exportId = insert(jdbcTemplate, """
                INSERT INTO Stock_export(from_branch_id, to_branch_id, employee_id, note, total_amount, exported_at)
                VALUES (?, ?, ?, ?, 45000, ?)
                """, "export_id",
                data.branchId(), data.transferBranchId(), data.warehouseStaffId(), "Smoke export " + code,
                LocalDateTime.now());
        stockExportIds.add(exportId);
        Long exportDetailId = insert(jdbcTemplate, """
                INSERT INTO Stock_export_detail(export_id, ingredient_id, quantity, unit, unit_price)
                VALUES (?, ?, 250, 'g', 180)
                """, "export_detail_id", exportId, data.ingredientId());
        stockExportDetailIds.add(exportDetailId);

        jdbcTemplate.update("UPDATE Warehouse_stock SET quantity = 4, min_quantity = 10 WHERE stock_id = ?", data.stockId());
        assertEquals(1L, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Warehouse_stock
                WHERE branch_id = ?
                  AND quantity < min_quantity
                """, data.branchId()));
    }

    private void deliveryStaffCanAcceptAndCompleteDeliveryOrder(JdbcTemplate jdbcTemplate, SmokeData data, String code) {
        Long orderId = insertOrder(jdbcTemplate, data.customerId(), data.salesStaffId(), data.branchId(),
                "delivery", "confirmed", "Smoke delivery order " + code + "\nGiao den: Smoke address", LocalDateTime.now());
        insertOrderDetail(jdbcTemplate, orderId, data.productId(), null, 1, 49_000L, data.sizeId());
        insertPayment(jdbcTemplate, orderId, 67_000L, "paid", LocalDateTime.now());

        assertFalse(jdbcTemplate.queryForList("""
                SELECT order_id
                FROM Order_
                WHERE branch_id = ?
                  AND order_type = 'delivery'
                  AND status = 'confirmed'
                """, data.branchId()).isEmpty());

        jdbcTemplate.update("""
                UPDATE Order_
                SET employee_id = ?, status = 'delivering', updated_at = ?
                WHERE order_id = ?
                """, data.deliveryStaffId(), LocalDateTime.now(), orderId);
        assertEquals("delivering", jdbcTemplate.queryForObject(
                "SELECT status FROM Order_ WHERE order_id = ?", String.class, orderId));

        jdbcTemplate.update("UPDATE Order_ SET status = 'completed', updated_at = ? WHERE order_id = ?",
                LocalDateTime.now(), orderId);
        assertEquals("completed", jdbcTemplate.queryForObject(
                "SELECT status FROM Order_ WHERE order_id = ?", String.class, orderId));
    }

    private void customerCanUpdateProfileSearchMenuAndPlaceDeliveryOrder(JdbcTemplate jdbcTemplate, SmokeData data, String code) {
        jdbcTemplate.update("""
                UPDATE Customer_detail
                SET phone_number = '0919222333', address = ?
                WHERE customer_id = ?
                """, "Updated customer address " + code, data.customerId());
        assertEquals("0919222333", jdbcTemplate.queryForObject(
                "SELECT phone_number FROM Customer_detail WHERE customer_id = ?",
                String.class, data.customerId()));

        assertEquals(1L, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Product
                WHERE product_name LIKE ?
                  AND status = 'active'
                """, "%Smoke Latte " + code + "%"));
        assertEquals(1L, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Combo
                WHERE combo_name LIKE ?
                  AND status = 'active'
                """, "%Smoke Combo " + code + "%"));

        Long orderId = insertOrder(jdbcTemplate, data.customerId(), data.salesStaffId(), data.branchId(),
                "delivery", "pending", "Customer smoke order " + code, LocalDateTime.now());
        insertOrderDetail(jdbcTemplate, orderId, data.productId(), null, 1, 49_000L, data.sizeId());
        insertPayment(jdbcTemplate, orderId, 67_000L, "pending", null);

        assertEquals(1L, count(jdbcTemplate, """
                SELECT COUNT(*)
                FROM Order_
                WHERE customer_id = ?
                  AND order_type = 'delivery'
                  AND status = 'pending'
                  AND note LIKE ?
                """, data.customerId(), "%" + code + "%"));
    }

    private Baseline baseline(JdbcTemplate jdbcTemplate) {
        Long branchManagerRoleId = roleId(jdbcTemplate, "Branch Manager");
        Long salesStaffRoleId = roleId(jdbcTemplate, "Sales Staff");
        if (salesStaffRoleId == null) {
            salesStaffRoleId = roleId(jdbcTemplate, "Sale Staff");
        }
        Long warehouseStaffRoleId = roleId(jdbcTemplate, "Warehouse Staff");
        Long deliveryStaffRoleId = roleId(jdbcTemplate, "Delivery Staff");
        Long rankId = jdbcTemplate.queryForObject(
                "SELECT rank_id FROM Membership_rank ORDER BY rank_order ASC LIMIT 1",
                Long.class);
        assertNotNull(branchManagerRoleId);
        assertNotNull(salesStaffRoleId);
        assertNotNull(warehouseStaffRoleId);
        assertNotNull(deliveryStaffRoleId);
        assertNotNull(rankId);
        return new Baseline(branchManagerRoleId, salesStaffRoleId, warehouseStaffRoleId, deliveryStaffRoleId, rankId);
    }

    private Long roleId(JdbcTemplate jdbcTemplate, String roleName) {
        List<Long> ids = jdbcTemplate.queryForList(
                "SELECT role_id FROM Role WHERE role_name = ? LIMIT 1",
                Long.class,
                roleName);
        return ids.isEmpty() ? null : ids.get(0);
    }

    private Long insertEmployee(JdbcTemplate jdbcTemplate, Long roleId, Long branchId, String name, String email) {
        Long employeeId = insert(jdbcTemplate, """
                INSERT INTO Employee(role_id, branch_id, name, status)
                VALUES (?, ?, ?, 'active')
                """, "id", roleId, branchId, name);
        employeeIds.add(employeeId);
        jdbcTemplate.update("""
                INSERT INTO Employee_detail(employee_id, email, phone_number, password, gender, created_at)
                VALUES (?, ?, '0909888777', ?, 'other', ?)
                """, employeeId, email,
                "$2a$10$VfZkDdc0VTm1EqOkVUQLp.VhK2rUC6EUC7r5zhy5YEZcJWU16KMvW",
                LocalDateTime.now());
        return employeeId;
    }

    private Long insertOrder(
            JdbcTemplate jdbcTemplate,
            Long customerId,
            Long employeeId,
            Long branchId,
            String orderType,
            String status,
            String note,
            LocalDateTime createdAt
    ) {
        Long orderId = insert(jdbcTemplate, """
                INSERT INTO Order_(customer_id, employee_id, branch_id, order_type, status, note, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, "order_id",
                customerId, employeeId, branchId, orderType, status, note, createdAt, createdAt);
        orderIds.add(orderId);
        return orderId;
    }

    private Long insertOrderDetail(
            JdbcTemplate jdbcTemplate,
            Long orderId,
            Long productId,
            Long comboId,
            int quantity,
            long unitPrice,
            Long sizeId
    ) {
        Long detailId = insert(jdbcTemplate, """
                INSERT INTO Order_detail(order_id, product_id, combo_id, quantity, unit_price, note, size_id)
                VALUES (?, ?, ?, ?, ?, 'Smoke order detail', ?)
                """, "order_detail_id", orderId, productId, comboId, quantity, unitPrice, sizeId);
        orderDetailIds.add(detailId);
        return detailId;
    }

    private Long insertPayment(
            JdbcTemplate jdbcTemplate,
            Long orderId,
            long amount,
            String status,
            LocalDateTime paidAt
    ) {
        Long paymentId = insert(jdbcTemplate, """
                INSERT INTO Payment(order_id, method, provider, amount, discount, drips_used, status, paid_at)
                VALUES (?, 'cash', 'smoke', ?, 0, 0, ?, ?)
                """, "payment_id", orderId, amount, status, paidAt);
        paymentIds.add(paymentId);
        return paymentId;
    }

    private void cleanup(JdbcTemplate jdbcTemplate) {
        deleteByIds(jdbcTemplate, "Payment", "payment_id", paymentIds);
        deleteByIds(jdbcTemplate, "Order_detail", "order_detail_id", orderDetailIds);
        deleteByIds(jdbcTemplate, "Order_", "order_id", orderIds);
        deleteByIds(jdbcTemplate, "Stock_import_detail", "import_detail_id", stockImportDetailIds);
        deleteByIds(jdbcTemplate, "Stock_import", "import_id", stockImportIds);
        deleteByIds(jdbcTemplate, "Stock_export_detail", "export_detail_id", stockExportDetailIds);
        deleteByIds(jdbcTemplate, "Stock_export", "export_id", stockExportIds);
        deleteByIds(jdbcTemplate, "Warehouse_stock", "stock_id", warehouseStockIds);
        deleteByIds(jdbcTemplate, "Warehouse_location", "location_id", warehouseLocationIds);
        for (Long supplierId : supplierIds) {
            jdbcTemplate.update("DELETE FROM Supplier_detail WHERE supplier_id = ?", supplierId);
        }
        deleteByIds(jdbcTemplate, "Supplier", "supplier_id", supplierIds);
        for (Long comboId : comboIds) {
            jdbcTemplate.update("DELETE FROM Combo_detail WHERE combo_id = ?", comboId);
        }
        deleteByIds(jdbcTemplate, "Combo", "combo_id", comboIds);
        deleteByIds(jdbcTemplate, "Recipe_detail", "recipe_detail_id", recipeDetailIds);
        deleteByIds(jdbcTemplate, "Recipe", "recipe_id", recipeIds);
        deleteByIds(jdbcTemplate, "Product_size", "size_id", productSizeIds);
        deleteByIds(jdbcTemplate, "Product", "product_id", productIds);
        deleteByIds(jdbcTemplate, "Ingredient", "ingredient_id", ingredientIds);
        deleteByIds(jdbcTemplate, "Product_category", "p_category_id", productCategoryIds);
        deleteByIds(jdbcTemplate, "Ingredient_category", "i_category_id", ingredientCategoryIds);
        for (Long customerId : customerIds) {
            jdbcTemplate.update("DELETE FROM Customer_loyalty WHERE customer_id = ?", customerId);
            jdbcTemplate.update("DELETE FROM Customer_detail WHERE customer_id = ?", customerId);
        }
        deleteByIds(jdbcTemplate, "Customer", "id", customerIds);
        for (Long employeeId : employeeIds) {
            jdbcTemplate.update("DELETE FROM Employee_detail WHERE employee_id = ?", employeeId);
        }
        deleteByIds(jdbcTemplate, "Employee", "id", employeeIds);
        deleteByIds(jdbcTemplate, "Branch", "branch_id", branchIds);
    }

    private void deleteByIds(JdbcTemplate jdbcTemplate, String table, String idColumn, List<Long> ids) {
        for (Long id : ids.reversed()) {
            jdbcTemplate.update("DELETE FROM " + table + " WHERE " + idColumn + " = ?", id);
        }
    }

    private Long insert(JdbcTemplate jdbcTemplate, String sql, String keyColumn, Object... args) {
        var keyHolder = new org.springframework.jdbc.support.GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var ps = connection.prepareStatement(sql, new String[]{keyColumn});
            for (int i = 0; i < args.length; i++) {
                ps.setObject(i + 1, args[i]);
            }
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        assertNotNull(key);
        return key.longValue();
    }

    private long count(JdbcTemplate jdbcTemplate, String sql, Object... args) {
        Number value = jdbcTemplate.queryForObject(sql, Number.class, args);
        return value == null ? 0L : value.longValue();
    }

    private long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private JdbcTemplate jdbcTemplate() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
        dataSource.setUrl(System.getenv("DB_URL"));
        dataSource.setUsername(System.getenv("DB_USERNAME"));
        dataSource.setPassword(System.getenv("DB_PASSWORD"));
        return new JdbcTemplate(dataSource);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record Baseline(
            Long branchManagerRoleId,
            Long salesStaffRoleId,
            Long warehouseStaffRoleId,
            Long deliveryStaffRoleId,
            Long rankId
    ) {}

    private record SmokeData(
            Long branchId,
            Long productCategoryId,
            Long ingredientCategoryId,
            Long ingredientId,
            Long productId,
            Long sizeId,
            Long recipeId,
            Long comboId,
            Long locationId,
            Long stockId,
            Long supplierId,
            Long branchManagerId,
            Long salesStaffId,
            Long warehouseStaffId,
            Long deliveryStaffId,
            Long customerId,
            Long transferBranchId
    ) {}
}
