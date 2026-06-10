package com.coffee.reportservice.config;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AprilMayOperationalDataSeeder implements ApplicationRunner {
    private static final LocalDate START_DATE = LocalDate.of(2026, 4, 1);
    private static final LocalDate END_DATE = LocalDate.of(2026, 5, 31);
    private static final String SEED_PREFIX = "AM2026";
    private static final String SEED_PASSWORD = "Coffee123@";

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final boolean enabled;

    public AprilMayOperationalDataSeeder(
            JdbcTemplate jdbcTemplate,
            @Value("${app.seed.april-may-operational-data.enabled:true}") boolean enabled
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.enabled = enabled;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        Map<String, Long> roleIds = seedRoles();
        List<BranchSeed> branches = branchSeeds();
        Map<String, Long> branchIds = seedBranches(branches);
        Map<String, Long> employeeIds = seedEmployees(employeeSeeds(), roleIds, branchIds);

        List<ProductSeed> products = productSeeds();
        Map<String, IngredientSeed> ingredients = uniqueIngredients(products);
        Map<String, Long> productCategoryIds = seedProductCategories(products);
        Map<String, Long> ingredientCategoryIds = seedIngredientCategories(ingredients);
        Map<String, Long> ingredientIds = seedIngredients(ingredients, ingredientCategoryIds);
        Map<String, Long> productIds = seedProducts(products, productCategoryIds);
        Map<String, Long> sizeIds = seedProductSizes(products, productIds);
        Map<String, Long> comboIds = seedCombos(products, productIds);
        seedRecipes(products, productIds, ingredientIds);

        Map<String, Long> rankIds = seedMembershipRanks();
        List<CustomerSeed> customers = customerSeeds();
        Map<String, Long> customerIds = seedCustomers(customers);

        Map<String, Long> locationIds = seedWarehouseLocations(branches, branchIds);
        seedWarehouseStock(branches, branchIds, locationIds, ingredients, ingredientIds);
        seedInventoryMovements(branches, branchIds, employeeIds, ingredients, ingredientIds);
        seedOrders(branches, branchIds, employeeIds, customers, customerIds, products, productIds, sizeIds, comboIds);
        refreshCustomerLoyalty(customerIds, rankIds);
    }

    private Map<String, Long> seedRoles() {
        Map<String, Long> roles = new LinkedHashMap<>();
        roles.put("admin", ensureRole("Admin", "admin", "system"));
        roles.put("branch_manager", ensureRole("Branch Manager", "manager", "sales"));
        roles.put("sales_staff", ensureRole("Sales Staff", "employee", "sales"));
        roles.put("warehouse_manager", ensureRole("Warehouse Manager", "manager", "warehouse"));
        roles.put("warehouse_staff", ensureRole("Warehouse Staff", "employee", "warehouse"));
        roles.put("delivery_staff", ensureRole("Delivery Staff", "employee", "sales"));
        return roles;
    }

    private Long ensureRole(String name, String group, String department) {
        Long id = optionalLong("SELECT role_id FROM Role WHERE role_name = ? LIMIT 1", name);
        if (id == null) {
            return insertForId(
                    "INSERT INTO Role(role_name, role_group, department, status) VALUES (?, ?, ?, 'active')",
                    "role_id",
                    name, group, department
            );
        }
        jdbcTemplate.update(
                "UPDATE Role SET role_group = ?, department = ?, status = 'active' WHERE role_id = ?",
                group, department, id
        );
        return id;
    }

    private Map<String, Long> seedBranches(List<BranchSeed> branches) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (BranchSeed branch : branches) {
            Long id = optionalLong("SELECT branch_id FROM Branch WHERE branch_name = ? LIMIT 1", branch.name());
            if (id == null) {
                id = insertForId(
                        """
                        INSERT INTO Branch(branch_name, address, phone, email, branch_type, status, address_detail,
                                           latitude, longitude, map_url)
                        VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
                        """,
                        "branch_id",
                        branch.name(), branch.address(), branch.phone(), branch.email(), branch.type(),
                        branch.addressDetail(), branch.latitude(), branch.longitude(), branch.mapUrl()
                );
            } else {
                jdbcTemplate.update(
                        """
                        UPDATE Branch
                        SET address = ?, phone = ?, email = ?, branch_type = ?, status = 'active',
                            address_detail = ?, latitude = ?, longitude = ?, map_url = ?
                        WHERE branch_id = ?
                        """,
                        branch.address(), branch.phone(), branch.email(), branch.type(), branch.addressDetail(),
                        branch.latitude(), branch.longitude(), branch.mapUrl(), id
                );
            }
            ids.put(branch.key(), id);
        }
        return ids;
    }

    private Map<String, Long> seedEmployees(
            List<EmployeeSeed> employees,
            Map<String, Long> roleIds,
            Map<String, Long> branchIds
    ) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (EmployeeSeed employee : employees) {
            Long roleId = roleIds.get(employee.roleKey());
            Long branchId = employee.branchKey() == null ? null : branchIds.get(employee.branchKey());
            Long id = optionalLong(
                    "SELECT employee_id FROM Employee_detail WHERE email = ? LIMIT 1",
                    employee.email()
            );
            if (id == null) {
                id = insertForId(
                        "INSERT INTO Employee(role_id, branch_id, name, status) VALUES (?, ?, ?, 'active')",
                        "id",
                        roleId, branchId, employee.name()
                );
                jdbcTemplate.update(
                        """
                        INSERT INTO Employee_detail(employee_id, email, phone_number, password, gender, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        id, employee.email(), employee.phone(), passwordHash(null), employee.gender(),
                        LocalDateTime.of(2026, 4, 1, 8, 0)
                );
            } else {
                jdbcTemplate.update(
                        "UPDATE Employee SET role_id = ?, branch_id = ?, name = ?, status = 'active' WHERE id = ?",
                        roleId, branchId, employee.name(), id
                );
                String currentHash = optionalString(
                        "SELECT password FROM Employee_detail WHERE employee_id = ?",
                        id
                );
                jdbcTemplate.update(
                        """
                        UPDATE Employee_detail
                        SET email = ?, phone_number = ?, password = ?, gender = ?
                        WHERE employee_id = ?
                        """,
                        employee.email(), employee.phone(), passwordHash(currentHash), employee.gender(), id
                );
            }
            ids.put(employee.key(), id);
        }
        return ids;
    }

    private Map<String, Long> seedProductCategories(List<ProductSeed> products) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (ProductSeed product : products) {
            ids.computeIfAbsent(product.category(), category -> {
                Long id = optionalLong(
                        "SELECT p_category_id FROM Product_category WHERE p_category_name = ? LIMIT 1",
                        category
                );
                if (id != null) {
                    return id;
                }
                return insertForId(
                        "INSERT INTO Product_category(p_category_name) VALUES (?)",
                        "p_category_id",
                        category
                );
            });
        }
        return ids;
    }

    private Map<String, Long> seedIngredientCategories(Map<String, IngredientSeed> ingredients) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (IngredientSeed ingredient : ingredients.values()) {
            ids.computeIfAbsent(ingredient.category(), category -> {
                Long id = optionalLong(
                        "SELECT i_category_id FROM Ingredient_category WHERE i_category_name = ? LIMIT 1",
                        category
                );
                if (id != null) {
                    return id;
                }
                return insertForId(
                        "INSERT INTO Ingredient_category(i_category_name) VALUES (?)",
                        "i_category_id",
                        category
                );
            });
        }
        return ids;
    }

    private Map<String, Long> seedIngredients(
            Map<String, IngredientSeed> ingredients,
            Map<String, Long> ingredientCategoryIds
    ) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (IngredientSeed ingredient : ingredients.values()) {
            Long categoryId = ingredientCategoryIds.get(ingredient.category());
            Long id = optionalLong(
                    "SELECT ingredient_id FROM Ingredient WHERE ingredient_name = ? LIMIT 1",
                    ingredient.name()
            );
            if (id == null) {
                id = insertForId(
                        """
                        INSERT INTO Ingredient(i_category_id, ingredient_name, unit, status)
                        VALUES (?, ?, ?, 'active')
                        """,
                        "ingredient_id",
                        categoryId, ingredient.name(), ingredient.unit()
                );
            } else {
                jdbcTemplate.update(
                        """
                        UPDATE Ingredient
                        SET i_category_id = ?, unit = ?, status = 'active'
                        WHERE ingredient_id = ?
                        """,
                        categoryId, ingredient.unit(), id
                );
            }
            ids.put(ingredient.name(), id);
        }
        return ids;
    }

    private Map<String, Long> seedProducts(
            List<ProductSeed> products,
            Map<String, Long> categoryIds
    ) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (ProductSeed product : products) {
            Long categoryId = categoryIds.get(product.category());
            Long id = optionalLong(
                    "SELECT product_id FROM Product WHERE product_name = ? LIMIT 1",
                    product.name()
            );
            if (id == null) {
                id = insertForId(
                        """
                        INSERT INTO Product(p_category_id, product_name, description, base_price,
                                            product_type, status, created_at)
                        VALUES (?, ?, ?, ?, ?, 'active', ?)
                        """,
                        "product_id",
                        categoryId, product.name(), product.description(), product.price(),
                        product.type(), START_DATE.atTime(7, 0)
                );
            } else {
                jdbcTemplate.update(
                        """
                        UPDATE Product
                        SET p_category_id = ?, description = ?, base_price = ?, product_type = ?, status = 'active'
                        WHERE product_id = ?
                        """,
                        categoryId, product.description(), product.price(), product.type(), id
                );
            }
            ids.put(product.key(), id);
        }
        return ids;
    }

    private Map<String, Long> seedProductSizes(
            List<ProductSeed> products,
            Map<String, Long> productIds
    ) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (ProductSeed product : products) {
            Long productId = productIds.get(product.key());
            ids.put(sizeKey(product.key(), "S"), ensureProductSize(productId, "S", 0L));
            ids.put(sizeKey(product.key(), "M"), ensureProductSize(productId, "M", 0L));
            ids.put(sizeKey(product.key(), "L"), ensureProductSize(productId, "L", 8_000L));
        }
        return ids;
    }

    private Long ensureProductSize(Long productId, String size, Long extraPrice) {
        Long id = optionalLong(
                "SELECT size_id FROM Product_size WHERE product_id = ? AND size = ? LIMIT 1",
                productId, size
        );
        if (id == null) {
            return insertForId(
                    """
                    INSERT INTO Product_size(product_id, size, extra_price, status)
                    VALUES (?, ?, ?, 'active')
                    """,
                    "size_id",
                    productId, size, extraPrice
            );
        }
        jdbcTemplate.update(
                "UPDATE Product_size SET extra_price = ?, status = 'active' WHERE size_id = ?",
                extraPrice, id
        );
        return id;
    }

    private Map<String, Long> seedCombos(
            List<ProductSeed> products,
            Map<String, Long> productIds
    ) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (ProductSeed product : products) {
            String comboName = "Combo " + product.category();
            Long id = optionalLong("SELECT combo_id FROM Combo WHERE combo_name = ? LIMIT 1", comboName);
            if (id == null) {
                id = insertForId(
                        """
                        INSERT INTO Combo(combo_name, description, category, price, start_date, end_date, status)
                        VALUES (?, ?, 'combo', ?, ?, ?, 'active')
                        """,
                        "combo_id",
                        comboName,
                        "Combo 2 ly " + product.name() + " danh cho nhom cung thich " + product.category() + ".",
                        product.comboPrice(),
                        START_DATE,
                        END_DATE
                );
            } else {
                jdbcTemplate.update(
                        """
                        UPDATE Combo
                        SET description = ?, category = 'combo', price = ?, start_date = ?, end_date = ?, status = 'active'
                        WHERE combo_id = ?
                        """,
                        "Combo 2 ly " + product.name() + " danh cho nhom cung thich " + product.category() + ".",
                        product.comboPrice(), START_DATE, END_DATE, id
                );
            }
            ensureComboDetail(id, productIds.get(product.key()), 2);
            ids.put(product.key(), id);
        }
        return ids;
    }

    private void ensureComboDetail(Long comboId, Long productId, int quantity) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM Combo_detail WHERE combo_id = ? AND product_id = ?",
                Integer.class,
                comboId, productId
        );
        if (count == null || count == 0) {
            jdbcTemplate.update(
                    "INSERT INTO Combo_detail(combo_id, product_id, quantity) VALUES (?, ?, ?)",
                    comboId, productId, quantity
            );
        } else {
            jdbcTemplate.update(
                    "UPDATE Combo_detail SET quantity = ? WHERE combo_id = ? AND product_id = ?",
                    quantity, comboId, productId
            );
        }
    }

    private void seedRecipes(
            List<ProductSeed> products,
            Map<String, Long> productIds,
            Map<String, Long> ingredientIds
    ) {
        for (ProductSeed product : products) {
            Long productId = productIds.get(product.key());
            String recipeName = "Cong thuc " + product.name();
            Long recipeId = optionalLong(
                    "SELECT recipe_id FROM Recipe WHERE product_id = ? AND recipe_name = ? LIMIT 1",
                    productId, recipeName
            );
            if (recipeId == null) {
                recipeId = insertForId(
                        "INSERT INTO Recipe(product_id, recipe_name, description) VALUES (?, ?, ?)",
                        "recipe_id",
                        productId, recipeName, "Dinh luong chuan cho " + product.name()
                );
            } else {
                jdbcTemplate.update(
                        "UPDATE Recipe SET description = ? WHERE recipe_id = ?",
                        "Dinh luong chuan cho " + product.name(), recipeId
                );
            }

            for (IngredientSeed ingredient : product.ingredients()) {
                Long ingredientId = ingredientIds.get(ingredient.name());
                ensureRecipeDetail(recipeId, ingredientId, ingredient, "S", 0.85D);
                ensureRecipeDetail(recipeId, ingredientId, ingredient, "M", 1.0D);
                ensureRecipeDetail(recipeId, ingredientId, ingredient, "L", 1.2D);
            }
        }
    }

    private void ensureRecipeDetail(
            Long recipeId,
            Long ingredientId,
            IngredientSeed ingredient,
            String size,
            double multiplier
    ) {
        double quantity = round1(ingredient.quantity() * multiplier);
        long estimatedTotal = Math.round(quantity * ingredient.unitPrice());
        Long id = optionalLong(
                """
                SELECT recipe_detail_id
                FROM Recipe_detail
                WHERE recipe_id = ? AND ingredient_id = ? AND size = ?
                LIMIT 1
                """,
                recipeId, ingredientId, size
        );
        if (id == null) {
            jdbcTemplate.update(
                    """
                    INSERT INTO Recipe_detail(recipe_id, ingredient_id, quantity, unit, size, estimated_total)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    recipeId, ingredientId, quantity, ingredient.unit(), size, estimatedTotal
            );
        } else {
            jdbcTemplate.update(
                    """
                    UPDATE Recipe_detail
                    SET quantity = ?, unit = ?, estimated_total = ?
                    WHERE recipe_detail_id = ?
                    """,
                    quantity, ingredient.unit(), estimatedTotal, id
            );
        }
    }

    private Map<String, Long> seedMembershipRanks() {
        Map<String, Long> ids = new LinkedHashMap<>();
        ids.put("gold", ensureMembershipRank(
                "Gold", 1, 0, 0L, 0, 3, 1.1D, 1.1D, "#F59E0B", "G",
                "Hang mac dinh cho khach hang moi; giam gia 3%, tich EXP va Drips x1.1."
        ));
        ids.put("platinum", ensureMembershipRank(
                "Platinum", 2, 1_500, 1_500_000L, 16, 5, 1.2D, 1.2D, "#6366F1", "P",
                "Dat tu 1.500 diem, 1.500.000d chi tieu hoac 16 don; giam gia 5%, tich EXP va Drips x1.2."
        ));
        ids.put("black", ensureMembershipRank(
                "Black", 3, 3_000, 3_000_000L, 30, 8, 1.4D, 1.4D, "#111827", "B",
                "Hang cao nhat cho khach than thiet; dat tu 3.000 diem, 3.000.000d chi tieu hoac 30 don; giam gia 8%, tich EXP va Drips x1.4."
        ));
        return ids;
    }

    private Long ensureMembershipRank(
            String name,
            int order,
            int minExp,
            long minMoney,
            int minOrders,
            int discount,
            double expMultiplier,
            double dripsMultiplier,
            String color,
            String icon,
            String description
    ) {
        Long id = optionalLong("SELECT rank_id FROM Membership_rank WHERE rank_name = ? LIMIT 1", name);
        if (id == null) {
            return insertForId(
                    """
                    INSERT INTO Membership_rank(rank_name, rank_order, min_exp, min_total_money, min_total_orders,
                                                discount_percent, exp_multiplier, drips_multiplier, description,
                                                status, color, icon)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                    """,
                    "rank_id",
                    name, order, minExp, minMoney, minOrders, discount, expMultiplier, dripsMultiplier,
                    description, color, icon
            );
        }
        jdbcTemplate.update(
                """
                UPDATE Membership_rank
                SET rank_order = ?, min_exp = ?, min_total_money = ?, min_total_orders = ?,
                    discount_percent = ?, exp_multiplier = ?, drips_multiplier = ?,
                    description = CASE
                        WHEN description IS NULL
                          OR TRIM(description) = ''
                          OR description IN (
                              'Hang thanh vien seed theo du lieu van hanh thang 04-05/2026.',
                              'Hang thanh vien mac dinh cua he thong.'
                          )
                        THEN ?
                        ELSE description
                    END,
                    status = 'active', color = ?, icon = ?
                WHERE rank_id = ?
                """,
                order, minExp, minMoney, minOrders, discount, expMultiplier, dripsMultiplier,
                description, color, icon, id
        );
        return id;
    }

    private Map<String, Long> seedCustomers(List<CustomerSeed> customers) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (CustomerSeed customer : customers) {
            if (isRetiredGemCustomerSeed(customer)) {
                continue;
            }
            Long id = optionalLong(
                    "SELECT customer_id FROM Customer_detail WHERE email = ? LIMIT 1",
                    customer.email()
            );
            if (id == null) {
                id = insertForId(
                        """
                        INSERT INTO Customer(name, gender, date_of_birth, status, created_at)
                        VALUES (?, ?, ?, 'active', ?)
                        """,
                        "id",
                        customer.name(), customer.gender(), customer.birthDate(), customer.createdAt()
                );
                jdbcTemplate.update(
                        """
                        INSERT INTO Customer_detail(customer_id, email, phone_number, password, address, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        id, customer.email(), customer.phone(), passwordHash(null), customer.address(),
                        customer.createdAt()
                );
            } else {
                jdbcTemplate.update(
                        """
                        UPDATE Customer
                        SET name = ?, gender = ?, date_of_birth = ?, status = 'active', created_at = ?
                        WHERE id = ?
                        """,
                        customer.name(), customer.gender(), customer.birthDate(), customer.createdAt(), id
                );
                String currentHash = optionalString(
                        "SELECT password FROM Customer_detail WHERE customer_id = ?",
                        id
                );
                jdbcTemplate.update(
                        """
                        UPDATE Customer_detail
                        SET email = ?, phone_number = ?, password = ?, address = ?
                        WHERE customer_id = ?
                        """,
                        customer.email(), customer.phone(), passwordHash(currentHash), customer.address(), id
                );
            }
            ids.put(customer.key(), id);
        }
        return ids;
    }

    private boolean isRetiredGemCustomerSeed(CustomerSeed customer) {
        return switch (customer.key()) {
            case "c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c10", "c11", "c12" -> true;
            default -> false;
        };
    }

    private Map<String, Long> seedWarehouseLocations(
            List<BranchSeed> branches,
            Map<String, Long> branchIds
    ) {
        Map<String, Long> locationIds = new LinkedHashMap<>();
        for (BranchSeed branch : branches) {
            Long branchId = branchIds.get(branch.key());
            Long id = optionalLong(
                    """
                    SELECT location_id
                    FROM Warehouse_location
                    WHERE branch_id = ? AND zone = ? AND shelf = ? AND slot = ?
                    LIMIT 1
                    """,
                    branchId, "A", "S01", "01"
            );
            if (id == null) {
                id = insertForId(
                        """
                        INSERT INTO Warehouse_location(branch_id, zone, shelf, slot)
                        VALUES (?, 'A', 'S01', '01')
                        """,
                        "location_id",
                        branchId
                );
            }
            locationIds.put(branch.key(), id);
        }
        return locationIds;
    }

    private void seedWarehouseStock(
            List<BranchSeed> branches,
            Map<String, Long> branchIds,
            Map<String, Long> locationIds,
            Map<String, IngredientSeed> ingredients,
            Map<String, Long> ingredientIds
    ) {
        List<IngredientSeed> ingredientList = new ArrayList<>(ingredients.values());
        for (int branchIndex = 0; branchIndex < branches.size(); branchIndex++) {
            BranchSeed branch = branches.get(branchIndex);
            Long branchId = branchIds.get(branch.key());
            Long locationId = locationIds.get(branch.key());
            for (int ingredientIndex = 0; ingredientIndex < ingredientList.size(); ingredientIndex++) {
                IngredientSeed ingredient = ingredientList.get(ingredientIndex);
                double min = minQuantity(ingredient.unit(), "warehouse".equals(branch.type()));
                double quantity = min * (1.25D + ((branchIndex + ingredientIndex) % 5) * 0.35D);
                if (!"warehouse".equals(branch.type()) && (branchIndex + ingredientIndex) % 11 == 0) {
                    quantity = min * 0.62D;
                }
                if ("warehouse".equals(branch.type())) {
                    quantity = min * 4.5D;
                }
                ensureWarehouseStock(
                        ingredientIds.get(ingredient.name()),
                        locationId,
                        branchId,
                        round1(quantity),
                        min,
                        ingredient.unit()
                );
            }
        }
    }

    private void ensureWarehouseStock(
            Long ingredientId,
            Long locationId,
            Long branchId,
            double quantity,
            double minQuantity,
            String unit
    ) {
        Long stockId = optionalLong(
                """
                SELECT stock_id
                FROM Warehouse_stock
                WHERE ingredient_id = ? AND branch_id = ?
                LIMIT 1
                """,
                ingredientId, branchId
        );
        if (stockId == null) {
            jdbcTemplate.update(
                    """
                    INSERT INTO Warehouse_stock(ingredient_id, location_id, branch_id, quantity, min_quantity, unit)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    ingredientId, locationId, branchId, quantity, minQuantity, unit
            );
        } else {
            jdbcTemplate.update(
                    """
                    UPDATE Warehouse_stock
                    SET location_id = ?, quantity = ?, min_quantity = ?, unit = ?
                    WHERE stock_id = ?
                    """,
                    locationId, quantity, minQuantity, unit, stockId
            );
        }
    }

    private void seedInventoryMovements(
            List<BranchSeed> branches,
            Map<String, Long> branchIds,
            Map<String, Long> employeeIds,
            Map<String, IngredientSeed> ingredients,
            Map<String, Long> ingredientIds
    ) {
        List<SupplierSeed> suppliers = supplierSeeds();
        Map<String, Long> supplierIds = seedSuppliers(suppliers);
        List<IngredientSeed> ingredientList = new ArrayList<>(ingredients.values());
        Long centralBranchId = branchIds.get("central_warehouse");
        Long warehouseEmployeeId = employeeIds.get("warehouse_staff_central");

        for (int branchIndex = 0; branchIndex < branches.size(); branchIndex++) {
            BranchSeed branch = branches.get(branchIndex);
            Long branchId = branchIds.get(branch.key());
            Long employeeId = "warehouse".equals(branch.type())
                    ? warehouseEmployeeId
                    : employeeIds.get("warehouse_staff_" + branch.key());
            for (int month = 4; month <= 5; month++) {
                String importCode = SEED_PREFIX + "-IMPORT-" + month + "-" + branch.key();
                LocalDateTime importedAt = LocalDateTime.of(2026, month, 4 + branchIndex * 2, 8, 30);
                Long importId = ensureStockImport(
                        importCode,
                        branchId,
                        supplierIds.get(suppliers.get(branchIndex % suppliers.size()).key()),
                        employeeId,
                        importedAt
                );
                long importTotal = 0L;
                for (int i = 0; i < ingredientList.size(); i++) {
                    IngredientSeed ingredient = ingredientList.get(i);
                    double quantity = importQuantity(ingredient.unit(), month, branchIndex, i);
                    long lineTotal = Math.round(quantity * ingredient.unitPrice());
                    ensureStockImportDetail(
                            importId,
                            ingredientIds.get(ingredient.name()),
                            quantity,
                            ingredient.unit(),
                            ingredient.unitPrice(),
                            LocalDate.of(2026, month, 1).plusMonths(expiryMonths(ingredient.unit()))
                    );
                    importTotal += lineTotal;
                }
                jdbcTemplate.update(
                        "UPDATE Stock_import SET total_amount = ? WHERE import_id = ?",
                        importTotal, importId
                );

                if (!"warehouse".equals(branch.type())) {
                    String exportCode = SEED_PREFIX + "-EXPORT-" + month + "-" + branch.key();
                    LocalDateTime exportedAt = LocalDateTime.of(2026, month, 10 + branchIndex * 2, 9, 15);
                    Long exportId = ensureStockExport(
                            exportCode,
                            centralBranchId,
                            branchId,
                            warehouseEmployeeId,
                            exportedAt
                    );
                    long exportTotal = 0L;
                    for (int i = 0; i < ingredientList.size(); i += 2) {
                        IngredientSeed ingredient = ingredientList.get(i);
                        double quantity = exportQuantity(ingredient.unit(), month, branchIndex, i);
                        long lineTotal = Math.round(quantity * ingredient.unitPrice());
                        ensureStockExportDetail(
                                exportId,
                                ingredientIds.get(ingredient.name()),
                                quantity,
                                ingredient.unit(),
                                ingredient.unitPrice()
                        );
                        exportTotal += lineTotal;
                    }
                    jdbcTemplate.update(
                            "UPDATE Stock_export SET total_amount = ? WHERE export_id = ?",
                            exportTotal, exportId
                    );
                }
            }
        }
    }

    private Map<String, Long> seedSuppliers(List<SupplierSeed> suppliers) {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (SupplierSeed supplier : suppliers) {
            Long id = optionalLong(
                    "SELECT supplier_id FROM Supplier WHERE supplier_name = ? LIMIT 1",
                    supplier.name()
            );
            if (id == null) {
                id = insertForId(
                        """
                        INSERT INTO Supplier(supplier_name, address, status, description)
                        VALUES (?, ?, 'active', ?)
                        """,
                        "supplier_id",
                        supplier.name(), supplier.address(), supplier.description()
                );
                jdbcTemplate.update(
                        """
                        INSERT INTO Supplier_detail(supplier_id, contact_person, phone, email, delivery_time)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        id, supplier.contact(), supplier.phone(), supplier.email(), supplier.deliveryDays()
                );
            } else {
                jdbcTemplate.update(
                        "UPDATE Supplier SET address = ?, status = 'active', description = ? WHERE supplier_id = ?",
                        supplier.address(), supplier.description(), id
                );
                Integer count = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM Supplier_detail WHERE supplier_id = ?",
                        Integer.class,
                        id
                );
                if (count == null || count == 0) {
                    jdbcTemplate.update(
                            """
                            INSERT INTO Supplier_detail(supplier_id, contact_person, phone, email, delivery_time)
                            VALUES (?, ?, ?, ?, ?)
                            """,
                            id, supplier.contact(), supplier.phone(), supplier.email(), supplier.deliveryDays()
                    );
                } else {
                    jdbcTemplate.update(
                            """
                            UPDATE Supplier_detail
                            SET contact_person = ?, phone = ?, email = ?, delivery_time = ?
                            WHERE supplier_id = ?
                            """,
                            supplier.contact(), supplier.phone(), supplier.email(), supplier.deliveryDays(), id
                    );
                }
            }
            ids.put(supplier.key(), id);
        }
        return ids;
    }

    private Long ensureStockImport(
            String code,
            Long branchId,
            Long supplierId,
            Long employeeId,
            LocalDateTime importedAt
    ) {
        Long id = optionalLong(
                "SELECT import_id FROM Stock_import WHERE note LIKE ? LIMIT 1",
                "%Seed code: " + code + "%"
        );
        String note = "Seed code: " + code + "\nNhap kho thuc te thang "
                + importedAt.getMonthValue() + "/2026.";
        if (id == null) {
            return insertForId(
                    """
                    INSERT INTO Stock_import(branch_id, supplier_id, employee_id, total_amount, note, imported_at)
                    VALUES (?, ?, ?, 0, ?, ?)
                    """,
                    "import_id",
                    branchId, supplierId, employeeId, note, importedAt
            );
        }
        jdbcTemplate.update(
                """
                UPDATE Stock_import
                SET branch_id = ?, supplier_id = ?, employee_id = ?, note = ?, imported_at = ?
                WHERE import_id = ?
                """,
                branchId, supplierId, employeeId, note, importedAt, id
        );
        return id;
    }

    private void ensureStockImportDetail(
            Long importId,
            Long ingredientId,
            double quantity,
            String unit,
            long unitPrice,
            LocalDate expiryDate
    ) {
        Long id = optionalLong(
                """
                SELECT import_detail_id
                FROM Stock_import_detail
                WHERE import_id = ? AND ingredient_id = ?
                LIMIT 1
                """,
                importId, ingredientId
        );
        if (id == null) {
            jdbcTemplate.update(
                    """
                    INSERT INTO Stock_import_detail(import_id, ingredient_id, quantity, unit, unit_price, expiry_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    importId, ingredientId, quantity, unit, unitPrice, expiryDate
            );
        } else {
            jdbcTemplate.update(
                    """
                    UPDATE Stock_import_detail
                    SET quantity = ?, unit = ?, unit_price = ?, expiry_date = ?
                    WHERE import_detail_id = ?
                    """,
                    quantity, unit, unitPrice, expiryDate, id
            );
        }
    }

    private Long ensureStockExport(
            String code,
            Long fromBranchId,
            Long toBranchId,
            Long employeeId,
            LocalDateTime exportedAt
    ) {
        Long id = optionalLong(
                "SELECT export_id FROM Stock_export WHERE note LIKE ? LIMIT 1",
                "%Seed code: " + code + "%"
        );
        String note = "Seed code: " + code + "\nXuat kho dieu chuyen thang "
                + exportedAt.getMonthValue() + "/2026.";
        if (id == null) {
            return insertForId(
                    """
                    INSERT INTO Stock_export(from_branch_id, to_branch_id, employee_id, note, total_amount, exported_at)
                    VALUES (?, ?, ?, ?, 0, ?)
                    """,
                    "export_id",
                    fromBranchId, toBranchId, employeeId, note, exportedAt
            );
        }
        jdbcTemplate.update(
                """
                UPDATE Stock_export
                SET from_branch_id = ?, to_branch_id = ?, employee_id = ?, note = ?, exported_at = ?
                WHERE export_id = ?
                """,
                fromBranchId, toBranchId, employeeId, note, exportedAt, id
        );
        return id;
    }

    private void ensureStockExportDetail(
            Long exportId,
            Long ingredientId,
            double quantity,
            String unit,
            long unitPrice
    ) {
        Long id = optionalLong(
                """
                SELECT export_detail_id
                FROM Stock_export_detail
                WHERE export_id = ? AND ingredient_id = ?
                LIMIT 1
                """,
                exportId, ingredientId
        );
        if (id == null) {
            jdbcTemplate.update(
                    """
                    INSERT INTO Stock_export_detail(export_id, ingredient_id, quantity, unit, unit_price)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    exportId, ingredientId, quantity, unit, unitPrice
            );
        } else {
            jdbcTemplate.update(
                    """
                    UPDATE Stock_export_detail
                    SET quantity = ?, unit = ?, unit_price = ?
                    WHERE export_detail_id = ?
                    """,
                    quantity, unit, unitPrice, id
            );
        }
    }

    private void seedOrders(
            List<BranchSeed> branches,
            Map<String, Long> branchIds,
            Map<String, Long> employeeIds,
            List<CustomerSeed> customers,
            Map<String, Long> customerIds,
            List<ProductSeed> products,
            Map<String, Long> productIds,
            Map<String, Long> sizeIds,
            Map<String, Long> comboIds
    ) {
        List<BranchSeed> salesBranches = branches.stream()
                .filter(branch -> "sales".equals(branch.type()))
                .toList();
        int sequence = 1;
        for (LocalDate day = START_DATE; !day.isAfter(END_DATE); day = day.plusDays(1)) {
            for (int branchIndex = 0; branchIndex < salesBranches.size(); branchIndex++) {
                BranchSeed branch = salesBranches.get(branchIndex);
                int orders = 2 + ((day.getDayOfMonth() + branchIndex) % 3);
                if (day.getDayOfWeek().getValue() >= 6) {
                    orders++;
                }
                for (int orderIndex = 0; orderIndex < orders; orderIndex++) {
                    String code = SEED_PREFIX + "-ORDER-" + String.format("%04d", sequence);
                    boolean delivery = ((day.getDayOfYear() + branchIndex + orderIndex) % 3) == 0;
                    String status = orderStatus(day, branchIndex, orderIndex, sequence, delivery);
                    if ("delivering".equals(status) || "confirmed".equals(status)) {
                        delivery = true;
                    }
                    String employeeKey = delivery && "delivering".equals(status)
                            ? "delivery_" + branch.key()
                            : "sales_" + branch.key();
                    CustomerSeed customer = customers.get((sequence + branchIndex) % customers.size());
                    OrderBuild order = buildOrderLines(sequence, branchIndex, products, productIds, sizeIds, comboIds);
                    long shippingFee = delivery ? 18_000L + (sequence % 4) * 4_000L : 0L;
                    long discount = sequence % 9 == 0 ? 8_000L : 0L;
                    long amount = Math.max(0L, order.total() + shippingFee - discount);
                    LocalDateTime createdAt = day.atTime(7 + (sequence % 14), (sequence * 11) % 60);
                    LocalDateTime updatedAt = updatedAt(createdAt, status, delivery);
                    String note = orderNote(code, customer, delivery, shippingFee, branch);

                    Long orderId = ensureOrder(
                            code,
                            customerIds.get(customer.key()),
                            employeeIds.get(employeeKey),
                            branchIds.get(branch.key()),
                            delivery ? "delivery" : "dine-in",
                            status,
                            note,
                            createdAt,
                            updatedAt
                    );
                    replaceOrderDetails(orderId, order.lines());
                    ensurePayment(
                            orderId,
                            sequence % 3 == 0 ? "e_wallet" : "cash",
                            sequence % 3 == 0 ? "VNPay" : "POS",
                            amount,
                            discount,
                            status,
                            "completed".equals(status) || "delivering".equals(status) ? updatedAt : null
                    );
                    sequence++;
                }
            }
        }
    }

    private String orderStatus(LocalDate day, int branchIndex, int orderIndex, int sequence, boolean delivery) {
        if (day.equals(END_DATE) && orderIndex == 0) {
            return "delivering";
        }
        if (day.equals(END_DATE) && orderIndex == 1) {
            return "confirmed";
        }
        if (sequence % 29 == 0) {
            return "cancelled";
        }
        return "completed";
    }

    private LocalDateTime updatedAt(LocalDateTime createdAt, String status, boolean delivery) {
        if ("cancelled".equals(status)) {
            return createdAt.plusMinutes(7);
        }
        if ("confirmed".equals(status)) {
            return createdAt.plusMinutes(5);
        }
        if ("delivering".equals(status)) {
            return createdAt.plusMinutes(22);
        }
        return createdAt.plusMinutes(delivery ? 42 : 16);
    }

    private OrderBuild buildOrderLines(
            int sequence,
            int branchIndex,
            List<ProductSeed> products,
            Map<String, Long> productIds,
            Map<String, Long> sizeIds,
            Map<String, Long> comboIds
    ) {
        List<OrderLine> lines = new ArrayList<>();
        long total = 0L;

        ProductSeed primary = products.get((sequence + branchIndex) % products.size());
        int quantity = 1 + (sequence % 2);
        long primaryPrice = primary.price() + (sequence % 4 == 0 ? 8_000L : 0L);
        String size = sequence % 4 == 0 ? "L" : "M";
        lines.add(new OrderLine(productIds.get(primary.key()), null, quantity, primaryPrice, sizeIds.get(sizeKey(primary.key(), size))));
        total += primaryPrice * quantity;

        if (sequence % 4 == 0) {
            ProductSeed secondary = products.get((sequence + branchIndex + 3) % products.size());
            lines.add(new OrderLine(productIds.get(secondary.key()), null, 1, secondary.price(), sizeIds.get(sizeKey(secondary.key(), "M"))));
            total += secondary.price();
        }

        if (sequence % 5 == 0) {
            ProductSeed comboProduct = products.get((sequence + 5) % products.size());
            lines.add(new OrderLine(null, comboIds.get(comboProduct.key()), 1, comboProduct.comboPrice(), null));
            total += comboProduct.comboPrice();
        }

        return new OrderBuild(lines, total);
    }

    private Long ensureOrder(
            String code,
            Long customerId,
            Long employeeId,
            Long branchId,
            String orderType,
            String status,
            String note,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        Long id = optionalLong(
                "SELECT order_id FROM Order_ WHERE note LIKE ? LIMIT 1",
                "%Seed code: " + code + "%"
        );
        if (id == null) {
            return insertForId(
                    """
                    INSERT INTO Order_(customer_id, employee_id, branch_id, order_type, status, note, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    "order_id",
                    customerId, employeeId, branchId, orderType, status, note, createdAt, updatedAt
            );
        }
        jdbcTemplate.update(
                """
                UPDATE Order_
                SET customer_id = ?, employee_id = ?, branch_id = ?, order_type = ?, status = ?,
                    note = ?, created_at = ?, updated_at = ?
                WHERE order_id = ?
                """,
                customerId, employeeId, branchId, orderType, status, note, createdAt, updatedAt, id
        );
        return id;
    }

    private void replaceOrderDetails(Long orderId, List<OrderLine> lines) {
        jdbcTemplate.update("DELETE FROM Order_detail WHERE order_id = ?", orderId);
        for (OrderLine line : lines) {
            jdbcTemplate.update(
                    """
                    INSERT INTO Order_detail(order_id, product_id, combo_id, quantity, unit_price, note, size_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    orderId, line.productId(), line.comboId(), line.quantity(), line.unitPrice(),
                    "Seed line " + SEED_PREFIX, line.sizeId()
            );
        }
    }

    private void ensurePayment(
            Long orderId,
            String method,
            String provider,
            long amount,
            long discount,
            String orderStatus,
            LocalDateTime paidAt
    ) {
        String paymentStatus = switch (orderStatus) {
            case "cancelled" -> "failed";
            case "confirmed" -> "pending";
            default -> "paid";
        };
        Long id = optionalLong("SELECT payment_id FROM Payment WHERE order_id = ? LIMIT 1", orderId);
        if (id == null) {
            jdbcTemplate.update(
                    """
                    INSERT INTO Payment(order_id, method, provider, amount, discount, drips_used, status, paid_at)
                    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                    """,
                    orderId, method, provider, amount, discount, paymentStatus, paidAt
            );
        } else {
            jdbcTemplate.update(
                    """
                    UPDATE Payment
                    SET method = ?, provider = ?, amount = ?, discount = ?, drips_used = 0,
                        status = ?, paid_at = ?
                    WHERE payment_id = ?
                    """,
                    method, provider, amount, discount, paymentStatus, paidAt, id
            );
        }
    }

    private void refreshCustomerLoyalty(Map<String, Long> customerIds, Map<String, Long> rankIds) {
        for (Long customerId : customerIds.values()) {
            Map<String, Object> row = jdbcTemplate.queryForMap(
                    """
                    SELECT COUNT(DISTINCT o.order_id) orders,
                           COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) money
                    FROM Order_ o
                    LEFT JOIN Payment p ON p.order_id = o.order_id
                    WHERE o.customer_id = ?
                      AND o.status = 'completed'
                    """,
                    customerId
            );
            int orders = longValue(row.get("orders")).intValue();
            long money = longValue(row.get("money"));
            int expPoint = Math.toIntExact(Math.min(Integer.MAX_VALUE, money / 1_000L));
            int dripsPoint = Math.max(0, expPoint - expPoint / 5);
            Long rankId = rankFor(money, orders, rankIds);
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM Customer_loyalty WHERE customer_id = ?",
                    Integer.class,
                    customerId
            );
            if (count == null || count == 0) {
                jdbcTemplate.update(
                        """
                        INSERT INTO Customer_loyalty(customer_id, rank_id, exp_point, drips_point,
                                                     total_money, total_orders, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        customerId, rankId, expPoint, dripsPoint, money, orders, END_DATE.atTime(22, 0)
                );
            } else {
                jdbcTemplate.update(
                        """
                        UPDATE Customer_loyalty
                        SET rank_id = ?, exp_point = ?, drips_point = ?, total_money = ?,
                            total_orders = ?, updated_at = ?
                        WHERE customer_id = ?
                        """,
                        rankId, expPoint, dripsPoint, money, orders, END_DATE.atTime(22, 0), customerId
                );
            }
        }
    }

    private Long rankFor(long money, int orders, Map<String, Long> rankIds) {
        if (money >= 3_000_000L || orders >= 30) {
            return rankIds.get("black");
        }
        if (money >= 1_500_000L || orders >= 16) {
            return rankIds.get("platinum");
        }
        return rankIds.get("gold");
    }

    private String orderNote(
            String code,
            CustomerSeed customer,
            boolean delivery,
            long shippingFee,
            BranchSeed branch
    ) {
        if (!delivery) {
            return "Seed code: " + code + "\nKhach hang: " + customer.name() + "\nHinh thuc: Tai quay";
        }
        double distance = 1.5D + (shippingFee / 4_000D % 4);
        long commission = Math.round(shippingFee * 0.72D);
        return "Seed code: " + code
                + "\nKhach hang: " + customer.name()
                + "\nSo dien thoai: " + customer.phone()
                + "\nGiao den: " + customer.address()
                + "\nNhan dia chi: Nha rieng"
                + "\nPhuong xa: " + branch.deliveryWard()
                + "\nQuan huyen: " + branch.deliveryDistrict()
                + "\nTinh thanh: Ho Chi Minh"
                + "\nPhi giao hang: " + shippingFee
                + "\nKhoang cach giao hang: " + round1(distance)
                + "\nTy le shipper: 0.72"
                + "\nThu nhap shipper: " + commission;
    }

    private Map<String, IngredientSeed> uniqueIngredients(List<ProductSeed> products) {
        Map<String, IngredientSeed> ingredients = new LinkedHashMap<>();
        for (ProductSeed product : products) {
            for (IngredientSeed ingredient : product.ingredients()) {
                ingredients.putIfAbsent(ingredient.name(), ingredient);
            }
        }
        return ingredients;
    }

    private String passwordHash(String currentHash) {
        if (currentHash != null && !currentHash.isBlank() && passwordEncoder.matches(SEED_PASSWORD, currentHash)) {
            return currentHash;
        }
        return passwordEncoder.encode(SEED_PASSWORD);
    }

    private Long optionalLong(String sql, Object... args) {
        List<Long> values = jdbcTemplate.queryForList(sql, Long.class, args);
        return values.isEmpty() ? null : values.get(0);
    }

    private String optionalString(String sql, Object... args) {
        List<String> values = jdbcTemplate.queryForList(sql, String.class, args);
        return values.isEmpty() ? null : values.get(0);
    }

    private Long insertForId(String sql, String keyColumn, Object... args) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{keyColumn});
            bind(ps, args);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Insert did not return generated key for " + keyColumn);
        }
        return key.longValue();
    }

    private void bind(PreparedStatement ps, Object... args) throws SQLException {
        for (int i = 0; i < args.length; i++) {
            ps.setObject(i + 1, args[i]);
        }
    }

    private Long longValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value == null) {
            return 0L;
        }
        return Long.parseLong(String.valueOf(value));
    }

    private double round1(double value) {
        return Math.round(value * 10.0D) / 10.0D;
    }

    private String sizeKey(String productKey, String size) {
        return productKey + ":" + size;
    }

    private double minQuantity(String unit, boolean warehouse) {
        double base = switch (unit) {
            case "g" -> 4_000D;
            case "kg" -> 12D;
            case "ml" -> 5_000D;
            case "l" -> 30D;
            default -> 20D;
        };
        return warehouse ? base * 3D : base;
    }

    private double importQuantity(String unit, int month, int branchIndex, int ingredientIndex) {
        double base = switch (unit) {
            case "g" -> 22_000D;
            case "kg" -> 40D;
            case "ml" -> 28_000D;
            case "l" -> 90D;
            default -> 40D;
        };
        return round1(base + month * 120D + branchIndex * 35D + ingredientIndex * 8D);
    }

    private double exportQuantity(String unit, int month, int branchIndex, int ingredientIndex) {
        double base = switch (unit) {
            case "g" -> 8_000D;
            case "kg" -> 12D;
            case "ml" -> 9_000D;
            case "l" -> 35D;
            default -> 15D;
        };
        return round1(base + month * 45D + branchIndex * 18D + ingredientIndex * 3D);
    }

    private long expiryMonths(String unit) {
        return switch (unit) {
            case "g", "kg" -> 6L;
            case "ml", "l" -> 3L;
            default -> 2L;
        };
    }

    private List<BranchSeed> branchSeeds() {
        return List.of(
                new BranchSeed("nguyen_hue", "CoffeeGo Nguyen Hue",
                        "42 Nguyen Hue, Ben Nghe, Quan 1, Ho Chi Minh",
                        "02838220041", "nguyenhue@coffeego.local", "sales",
                        "Mat tien pho di bo Nguyen Hue", 10.7731D, 106.7042D,
                        "https://maps.google.com/?q=42+Nguyen+Hue+Ho+Chi+Minh",
                        "Ben Nghe", "Quan 1"),
                new BranchSeed("tan_dinh", "CoffeeGo Tan Dinh",
                        "174 Hai Ba Trung, Phuong Tan Dinh, Quan 1, Ho Chi Minh",
                        "02838200074", "tandinh@coffeego.local", "sales",
                        "Gan cho Tan Dinh", 10.7903D, 106.6907D,
                        "https://maps.google.com/?q=174+Hai+Ba+Trung+Ho+Chi+Minh",
                        "Tan Dinh", "Quan 1"),
                new BranchSeed("thu_duc", "CoffeeGo Thu Duc",
                        "1 Vo Van Ngan, Linh Chieu, Thu Duc, Ho Chi Minh",
                        "02837220001", "thuduc@coffeego.local", "sales",
                        "Khu dai hoc Thu Duc", 10.8490D, 106.7716D,
                        "https://maps.google.com/?q=1+Vo+Van+Ngan+Thu+Duc",
                        "Linh Chieu", "Thu Duc"),
                new BranchSeed("central_warehouse", "CoffeeGo Central Warehouse",
                        "15 Ben Van Don, Phuong 12, Quan 4, Ho Chi Minh",
                        "02839400015", "warehouse@coffeego.local", "warehouse",
                        "Kho trung tam dieu phoi nguyen lieu", 10.7626D, 106.7047D,
                        "https://maps.google.com/?q=15+Ben+Van+Don+Ho+Chi+Minh",
                        "Phuong 12", "Quan 4")
        );
    }

    private List<EmployeeSeed> employeeSeeds() {
        return List.of(
                new EmployeeSeed("ops_admin", "Nguyen Hoang Anh", "admin", null,
                        "ops.admin@coffeego.local", "0901000001", "male"),
                new EmployeeSeed("manager_nguyen_hue", "Tran Minh Quan", "branch_manager", "nguyen_hue",
                        "manager.nguyenhue@coffeego.local", "0901000011", "male"),
                new EmployeeSeed("manager_tan_dinh", "Le Thu Ha", "branch_manager", "tan_dinh",
                        "manager.tandinh@coffeego.local", "0901000012", "female"),
                new EmployeeSeed("manager_thu_duc", "Pham Gia Bao", "branch_manager", "thu_duc",
                        "manager.thuduc@coffeego.local", "0901000013", "male"),
                new EmployeeSeed("sales_nguyen_hue", "Vo Ngoc Linh", "sales_staff", "nguyen_hue",
                        "sales.nguyenhue@coffeego.local", "0901000021", "female"),
                new EmployeeSeed("sales_tan_dinh", "Do Quang Huy", "sales_staff", "tan_dinh",
                        "sales.tandinh@coffeego.local", "0901000022", "male"),
                new EmployeeSeed("sales_thu_duc", "Bui Khanh Vy", "sales_staff", "thu_duc",
                        "sales.thuduc@coffeego.local", "0901000023", "female"),
                new EmployeeSeed("warehouse_manager_central", "Huynh Duc Phat", "warehouse_manager", "central_warehouse",
                        "warehouse.manager@coffeego.local", "0901000030", "male"),
                new EmployeeSeed("warehouse_staff_central", "Ngo Thanh Tam", "warehouse_staff", "central_warehouse",
                        "warehouse.central@coffeego.local", "0901000031", "male"),
                new EmployeeSeed("warehouse_staff_nguyen_hue", "Dang My Duyen", "warehouse_staff", "nguyen_hue",
                        "warehouse.nguyenhue@coffeego.local", "0901000032", "female"),
                new EmployeeSeed("warehouse_staff_tan_dinh", "Mai Quoc Viet", "warehouse_staff", "tan_dinh",
                        "warehouse.tandinh@coffeego.local", "0901000033", "male"),
                new EmployeeSeed("warehouse_staff_thu_duc", "Cao Nhat Nam", "warehouse_staff", "thu_duc",
                        "warehouse.thuduc@coffeego.local", "0901000034", "male"),
                new EmployeeSeed("delivery_nguyen_hue", "Pham Nhat Khang", "delivery_staff", "nguyen_hue",
                        "delivery.nguyenhue@coffeego.local", "0901000041", "male"),
                new EmployeeSeed("delivery_tan_dinh", "Nguyen Bao Tram", "delivery_staff", "tan_dinh",
                        "delivery.tandinh@coffeego.local", "0901000042", "female"),
                new EmployeeSeed("delivery_thu_duc", "Truong Minh Tri", "delivery_staff", "thu_duc",
                        "delivery.thuduc@coffeego.local", "0901000043", "male")
        );
    }

    private List<ProductSeed> productSeeds() {
        return List.of(
                new ProductSeed("phin_milk", "Ca phe phin", "Ca Phe Sua Da",
                        "Ca phe phin robusta rang dam, sua dac va da vien.", 35_000L, "phin", 65_000L,
                        List.of(
                                new IngredientSeed("Robusta rang xay", "Ca phe", "g", 25D, 180L),
                                new IngredientSeed("Sua dac", "Sua va kem", "ml", 35D, 65L),
                                new IngredientSeed("Da vien", "Vat tu pha che", "g", 180D, 2L)
                        )),
                new ProductSeed("espresso_bac_xiu", "Espresso", "Bac Xiu Espresso",
                        "Shot espresso nhe, sua tuoi va sua dac theo kieu bac xiu.", 45_000L, "espresso", 85_000L,
                        List.of(
                                new IngredientSeed("Espresso blend", "Ca phe", "g", 18D, 260L),
                                new IngredientSeed("Sua tuoi thanh trung", "Sua va kem", "ml", 140D, 38L),
                                new IngredientSeed("Sua dac", "Sua va kem", "ml", 25D, 65L)
                        )),
                new ProductSeed("cold_brew_orange", "Cold brew", "Cold Brew Cam Sa",
                        "Ca phe u lanh 16 gio ket hop cam tuoi va sa cay.", 49_000L, "cold_brew", 92_000L,
                        List.of(
                                new IngredientSeed("Cold brew concentrate", "Ca phe", "ml", 120D, 42L),
                                new IngredientSeed("Cam tuoi", "Trai cay", "g", 90D, 70L),
                                new IngredientSeed("Sa cay", "Trai cay", "g", 8D, 55L)
                        )),
                new ProductSeed("peach_tea", "Tra trai cay", "Tra Dao Cam Sa",
                        "Tra den, dao mieng, cam tuoi va sa cay.", 45_000L, "fruit_tea", 84_000L,
                        List.of(
                                new IngredientSeed("Tra den", "Tra", "g", 8D, 210L),
                                new IngredientSeed("Dao mieng", "Trai cay", "g", 70D, 95L),
                                new IngredientSeed("Cam tuoi", "Trai cay", "g", 50D, 70L),
                                new IngredientSeed("Sa cay", "Trai cay", "g", 6D, 55L)
                        )),
                new ProductSeed("oolong_milk_tea", "Tra sua", "Tra Sua Oolong Tran Chau",
                        "Tra oolong, sua tuoi, duong nau va tran chau den.", 43_000L, "milk_tea", 82_000L,
                        List.of(
                                new IngredientSeed("Tra oolong", "Tra", "g", 8D, 230L),
                                new IngredientSeed("Sua tuoi thanh trung", "Sua va kem", "ml", 120D, 38L),
                                new IngredientSeed("Tran chau den", "Topping", "g", 45D, 55L),
                                new IngredientSeed("Duong nau", "Duong va syrup", "g", 25D, 28L)
                        )),
                new ProductSeed("matcha_blended", "Da xay", "Matcha Da Xay",
                        "Matcha Nhat, sua tuoi va kem whipping xay min.", 55_000L, "ice_blended", 103_000L,
                        List.of(
                                new IngredientSeed("Bot matcha", "Tra", "g", 12D, 520L),
                                new IngredientSeed("Sua tuoi thanh trung", "Sua va kem", "ml", 150D, 38L),
                                new IngredientSeed("Kem whipping", "Sua va kem", "ml", 35D, 85L),
                                new IngredientSeed("Da vien", "Vat tu pha che", "g", 220D, 2L)
                        )),
                new ProductSeed("avocado_smoothie", "Sinh to", "Sinh To Bo",
                        "Bo sap, sua tuoi va sua dac xay be mui, vi beo mem.", 52_000L, "smoothie", 98_000L,
                        List.of(
                                new IngredientSeed("Bo sap", "Trai cay", "g", 130D, 120L),
                                new IngredientSeed("Sua tuoi thanh trung", "Sua va kem", "ml", 120D, 38L),
                                new IngredientSeed("Sua dac", "Sua va kem", "ml", 25D, 65L),
                                new IngredientSeed("Da vien", "Vat tu pha che", "g", 160D, 2L)
                        )),
                new ProductSeed("orange_cucumber", "Nuoc ep", "Nuoc Ep Cam Dua Leo",
                        "Cam tuoi ep lanh voi dua leo, vi thanh nhe.", 48_000L, "juice", 90_000L,
                        List.of(
                                new IngredientSeed("Cam tuoi", "Trai cay", "g", 170D, 70L),
                                new IngredientSeed("Dua leo", "Trai cay", "g", 80D, 38L),
                                new IngredientSeed("Syrup duong", "Duong va syrup", "ml", 12D, 35L)
                        )),
                new ProductSeed("butter_croissant", "Banh ngot", "Croissant Bo",
                        "Croissant bo nuong nong trong ngay.", 39_000L, "bakery", 72_000L,
                        List.of(
                                new IngredientSeed("Bot mi so 13", "Banh", "g", 85D, 24L),
                                new IngredientSeed("Bo lat", "Banh", "g", 35D, 145L),
                                new IngredientSeed("Men no", "Banh", "g", 2D, 80L)
                        )),
                new ProductSeed("chicken_stick", "Snack man", "Banh Mi Que Ga Xe",
                        "Banh mi que gion, ga xe va sot mayo cay nhe.", 42_000L, "snack", 78_000L,
                        List.of(
                                new IngredientSeed("Banh mi que", "Banh", "g", 65D, 35L),
                                new IngredientSeed("Ga xe", "Thuc pham", "g", 70D, 95L),
                                new IngredientSeed("Sot mayonnaise", "Thuc pham", "g", 18D, 62L)
                        ))
        );
    }

    private List<CustomerSeed> customerSeeds() {
        return List.of(
                new CustomerSeed("c01", "Nguyen Minh Chau", "female", LocalDate.of(1996, 3, 14),
                        "chau.nguyen@customer.coffeego.local", "0912000001",
                        "12 Ly Tu Trong, Quan 1, Ho Chi Minh", LocalDateTime.of(2026, 4, 2, 9, 0)),
                new CustomerSeed("c02", "Tran Duc Long", "male", LocalDate.of(1991, 8, 22),
                        "long.tran@customer.coffeego.local", "0912000002",
                        "88 Pasteur, Quan 1, Ho Chi Minh", LocalDateTime.of(2026, 4, 3, 10, 15)),
                new CustomerSeed("c03", "Le Hoai An", "female", LocalDate.of(1998, 1, 5),
                        "an.le@customer.coffeego.local", "0912000003",
                        "31 Cach Mang Thang Tam, Quan 3, Ho Chi Minh", LocalDateTime.of(2026, 4, 4, 11, 20)),
                new CustomerSeed("c04", "Pham Thanh Son", "male", LocalDate.of(1989, 12, 9),
                        "son.pham@customer.coffeego.local", "0912000004",
                        "215 Nam Ky Khoi Nghia, Quan 3, Ho Chi Minh", LocalDateTime.of(2026, 4, 6, 8, 45)),
                new CustomerSeed("c05", "Hoang Bich Ngoc", "female", LocalDate.of(1994, 7, 18),
                        "ngoc.hoang@customer.coffeego.local", "0912000005",
                        "19 Nguyen Thi Minh Khai, Quan 1, Ho Chi Minh", LocalDateTime.of(2026, 4, 8, 14, 0)),
                new CustomerSeed("c06", "Bui Quang Vinh", "male", LocalDate.of(1993, 5, 11),
                        "vinh.bui@customer.coffeego.local", "0912000006",
                        "74 Vo Thi Sau, Quan 3, Ho Chi Minh", LocalDateTime.of(2026, 4, 11, 16, 30)),
                new CustomerSeed("c07", "Dang Khanh Linh", "female", LocalDate.of(2000, 10, 21),
                        "linh.dang@customer.coffeego.local", "0912000007",
                        "2 Truong Sa, Binh Thanh, Ho Chi Minh", LocalDateTime.of(2026, 4, 15, 12, 10)),
                new CustomerSeed("c08", "Vo Huu Phuoc", "male", LocalDate.of(1987, 9, 3),
                        "phuoc.vo@customer.coffeego.local", "0912000008",
                        "55 Xo Viet Nghe Tinh, Binh Thanh, Ho Chi Minh", LocalDateTime.of(2026, 4, 21, 18, 5)),
                new CustomerSeed("c09", "Mai Yen Nhi", "female", LocalDate.of(1999, 6, 17),
                        "nhi.mai@customer.coffeego.local", "0912000009",
                        "120 Dinh Tien Hoang, Binh Thanh, Ho Chi Minh", LocalDateTime.of(2026, 5, 1, 9, 35)),
                new CustomerSeed("c10", "Cao Minh Tuan", "male", LocalDate.of(1992, 11, 28),
                        "tuan.cao@customer.coffeego.local", "0912000010",
                        "9 Phan Xich Long, Phu Nhuan, Ho Chi Minh", LocalDateTime.of(2026, 5, 4, 10, 5)),
                new CustomerSeed("c11", "Ngo Thuy Duong", "female", LocalDate.of(1997, 4, 30),
                        "duong.ngo@customer.coffeego.local", "0912000011",
                        "18 Hoang Dieu 2, Thu Duc, Ho Chi Minh", LocalDateTime.of(2026, 5, 12, 13, 50)),
                new CustomerSeed("c12", "Truong Hai Nam", "male", LocalDate.of(1990, 2, 6),
                        "nam.truong@customer.coffeego.local", "0912000012",
                        "33 Kha Van Can, Thu Duc, Ho Chi Minh", LocalDateTime.of(2026, 5, 20, 15, 40))
        );
    }

    private List<SupplierSeed> supplierSeeds() {
        return List.of(
                new SupplierSeed("coffee_supply", "Saigon Coffee Supply",
                        "28 Nguyen Van Thuong, Binh Thanh, Ho Chi Minh",
                        "Nguyen Quoc Bao", "02835550011", "coffee.supply@coffeego.local", 2,
                        "Nha cung cap hat rang, cold brew va espresso blend."),
                new SupplierSeed("fresh_farm", "Dalat Fresh Farm",
                        "12 Nguyen Thai Hoc, Da Lat, Lam Dong",
                        "Le My Hanh", "02633550022", "fresh.farm@coffeego.local", 3,
                        "Nha cung cap trai cay, rau cu va nguyen lieu tuoi."),
                new SupplierSeed("bakery_partner", "Saigon Bakery Partner",
                        "95 Au Co, Tan Binh, Ho Chi Minh",
                        "Tran Hoang Lam", "02839770033", "bakery.partner@coffeego.local", 1,
                        "Nha cung cap bot, bo, banh va thuc pham an kem.")
        );
    }

    private record BranchSeed(
            String key,
            String name,
            String address,
            String phone,
            String email,
            String type,
            String addressDetail,
            Double latitude,
            Double longitude,
            String mapUrl,
            String deliveryWard,
            String deliveryDistrict
    ) {}

    private record EmployeeSeed(
            String key,
            String name,
            String roleKey,
            String branchKey,
            String email,
            String phone,
            String gender
    ) {}

    private record ProductSeed(
            String key,
            String category,
            String name,
            String description,
            long price,
            String type,
            long comboPrice,
            List<IngredientSeed> ingredients
    ) {}

    private record IngredientSeed(
            String name,
            String category,
            String unit,
            double quantity,
            long unitPrice
    ) {}

    private record CustomerSeed(
            String key,
            String name,
            String gender,
            LocalDate birthDate,
            String email,
            String phone,
            String address,
            LocalDateTime createdAt
    ) {}

    private record SupplierSeed(
            String key,
            String name,
            String address,
            String contact,
            String phone,
            String email,
            int deliveryDays,
            String description
    ) {}

    private record OrderLine(
            Long productId,
            Long comboId,
            int quantity,
            long unitPrice,
            Long sizeId
    ) {}

    private record OrderBuild(List<OrderLine> lines, long total) {}
}
