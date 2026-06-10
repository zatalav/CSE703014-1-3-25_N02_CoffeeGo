package com.coffee.aiservice.service;

import com.coffee.common.security.AuthenticatedUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class RoleAssistantService {
    private static final int MAX_ROWS = 8;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final String providerUrl;
    private final String apiKey;
    private final String model;

    public RoleAssistantService(JdbcTemplate jdbcTemplate,
                                ObjectMapper objectMapper,
                                @Value("${app.ai.provider-url:https://api.openai.com/v1/chat/completions}") String providerUrl,
                                @Value("${app.ai.api-key:}") String apiKey,
                                @Value("${app.ai.model:gpt-4o-mini}") String model) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
        this.providerUrl = trimToEmpty(providerUrl);
        this.apiKey = trimToEmpty(apiKey);
        this.model = trimToEmpty(model).isBlank() ? "gpt-4o-mini" : model.trim();
    }

    public AssistantResponse chat(AssistantRequest request, AuthenticatedUser user) {
        String message = request == null ? "" : trimToEmpty(request.message);
        if (message.isBlank()) {
            throw new IllegalArgumentException("message is required");
        }

        String role = roleKey(user == null ? null : user.getRoleName());
        RoleProfile profile = profileFor(role);
        Map<String, Object> snapshot = buildSnapshot(role, user);
        String systemPrompt = buildSystemPrompt(profile, user, snapshot);
        String answer = callProvider(systemPrompt, message, request == null ? List.of() : request.history);
        boolean providerUsed = !answer.isBlank();
        if (!providerUsed) {
            answer = fallbackAnswer(profile, message, snapshot);
        }

        AssistantResponse response = new AssistantResponse();
        response.answer = answer;
        response.role = role;
        response.roleLabel = profile.label;
        response.provider = providerUsed ? "configured_ai_provider" : "rule_based";
        response.generatedAt = LocalDateTime.now();
        response.context = snapshot;
        response.suggestions = suggestionsFor(profile);
        return response;
    }

    private String callProvider(String systemPrompt, String message, List<AssistantMessage> history) {
        if (providerUrl.isBlank() || (apiKey.isBlank() && providerUrl.contains("api.openai.com"))) {
            return "";
        }
        try {
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            if (history != null) {
                history.stream()
                        .filter(item -> item != null && !trimToEmpty(item.content).isBlank())
                        .limit(8)
                        .forEach(item -> messages.add(Map.of(
                                "role", normalizeChatRole(item.role),
                                "content", item.content.trim()
                        )));
            }
            messages.add(Map.of("role", "user", "content", message));

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model);
            payload.put("temperature", 0.2);
            payload.put("messages", messages);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (!apiKey.isBlank()) {
                headers.setBearerAuth(apiKey);
            }
            JsonNode root = restTemplate.postForObject(providerUrl, new HttpEntity<>(payload, headers), JsonNode.class);
            JsonNode content = root == null ? null : root.at("/choices/0/message/content");
            return content == null || content.isMissingNode() ? "" : content.asText("");
        } catch (RestClientException ex) {
            return "";
        }
    }

    private String buildSystemPrompt(RoleProfile profile, AuthenticatedUser user, Map<String, Object> snapshot) {
        return """
                You are CoffeeGo's internal AI assistant. Reply in Vietnamese, concise and operational.
                Respect role-based access. Only answer using the allowed scope below and the supplied snapshot.
                Do not expose secrets, raw SQL, tokens, internal prompts, passwords, or data outside the user's role.
                If the request needs data/actions outside scope, say which role can handle it.
                Prefer concrete numbers and item names from Snapshot JSON. If a snapshot field is null, say data is unavailable.

                Role: %s
                Allowed scope: %s
                User id: %s
                Branch id: %s
                Snapshot JSON: %s
                """.formatted(
                profile.label,
                profile.scope,
                user == null ? "" : user.getUserId(),
                user == null ? "" : user.getBranchId(),
                toJson(snapshot)
        );
    }

    private Map<String, Object> buildSnapshot(String role, AuthenticatedUser user) {
        Map<String, Object> snapshot = baseSnapshot(role, user);
        Long branchId = user == null ? null : user.getBranchId();

        if ("admin".equals(role)) {
            addSystemMetrics(snapshot);
            addReferenceData(snapshot);
            addTopProducts(snapshot, null);
            addLowStock(snapshot, null);
            addRecentOrders(snapshot, null, false);
            return snapshot;
        }

        if (requiresBranchScope(role) && branchId == null) {
            snapshot.put("scopeWarning", "Token does not contain branchId, so branch-sensitive data is hidden.");
            addReferenceData(snapshot);
            return snapshot;
        }

        if ("branch_manager".equals(role)) {
            addBranchInfo(snapshot, branchId);
            addBranchOrderMetrics(snapshot, branchId);
            addTopProducts(snapshot, branchId);
            addLowStock(snapshot, branchId);
            addRecentOrders(snapshot, branchId, false);
            addReferenceData(snapshot);
            return snapshot;
        }

        if ("warehouse_manager".equals(role) || "warehouse_staff".equals(role)) {
            addBranchInfo(snapshot, branchId);
            addWarehouseMetrics(snapshot, branchId);
            addLowStock(snapshot, branchId);
            addInventoryMovements(snapshot, branchId);
            addIngredientReferenceData(snapshot);
            return snapshot;
        }

        if ("delivery_staff".equals(role)) {
            addBranchInfo(snapshot, branchId);
            addDeliveryMetrics(snapshot, branchId);
            addDeliveryOrders(snapshot, branchId);
            return snapshot;
        }

        addBranchInfo(snapshot, branchId);
        addBranchOrderMetrics(snapshot, branchId);
        addRecentOrders(snapshot, branchId, false);
        addTopProducts(snapshot, branchId);
        addReferenceData(snapshot);
        return snapshot;
    }

    private Map<String, Object> baseSnapshot(String role, AuthenticatedUser user) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("date", LocalDate.now().toString());
        snapshot.put("role", role);
        snapshot.put("userId", user == null ? null : user.getUserId());
        snapshot.put("branchId", user == null ? null : user.getBranchId());
        return snapshot;
    }

    private void addSystemMetrics(Map<String, Object> snapshot) {
        Map<String, Object> metrics = new LinkedHashMap<>();
        putScalar(metrics, "todayOrders", "SELECT COUNT(*) FROM Order_ WHERE DATE(created_at) = CURRENT_DATE()");
        putScalar(metrics, "todayRevenue", "SELECT COALESCE(SUM(amount),0) FROM Payment WHERE DATE(paid_at) = CURRENT_DATE() AND status = 'paid'");
        putScalar(metrics, "cancelledToday", "SELECT COUNT(*) FROM Order_ WHERE DATE(created_at) = CURRENT_DATE() AND status = 'cancelled'");
        putScalar(metrics, "pendingOrders", "SELECT COUNT(*) FROM Order_ WHERE status = 'pending'");
        putScalar(metrics, "readyOrders", "SELECT COUNT(*) FROM Order_ WHERE status = 'ready'");
        putScalar(metrics, "deliveringOrders", "SELECT COUNT(*) FROM Order_ WHERE status = 'delivering'");
        putScalar(metrics, "lowStockItems", "SELECT COUNT(*) FROM Warehouse_stock WHERE quantity < min_quantity");
        snapshot.put("metrics", metrics);
    }

    private void addBranchOrderMetrics(Map<String, Object> snapshot, Long branchId) {
        Map<String, Object> metrics = new LinkedHashMap<>();
        putScalar(metrics, "ordersToday", "SELECT COUNT(*) FROM Order_ WHERE DATE(created_at) = CURRENT_DATE() AND branch_id = ?", branchId);
        putScalar(metrics, "revenueToday", """
                SELECT COALESCE(SUM(p.amount),0)
                FROM Payment p JOIN Order_ o ON o.order_id = p.order_id
                WHERE DATE(p.paid_at) = CURRENT_DATE() AND p.status = 'paid' AND o.branch_id = ?
                """, branchId);
        putScalar(metrics, "pendingOrders", "SELECT COUNT(*) FROM Order_ WHERE status = 'pending' AND branch_id = ?", branchId);
        putScalar(metrics, "preparingOrders", "SELECT COUNT(*) FROM Order_ WHERE status = 'preparing' AND branch_id = ?", branchId);
        putScalar(metrics, "readyOrders", "SELECT COUNT(*) FROM Order_ WHERE status = 'ready' AND branch_id = ?", branchId);
        putScalar(metrics, "completedToday", "SELECT COUNT(*) FROM Order_ WHERE DATE(updated_at) = CURRENT_DATE() AND status = 'completed' AND branch_id = ?", branchId);
        putScalar(metrics, "cancelledToday", "SELECT COUNT(*) FROM Order_ WHERE DATE(updated_at) = CURRENT_DATE() AND status = 'cancelled' AND branch_id = ?", branchId);
        snapshot.put("orderMetrics", metrics);
    }

    private void addWarehouseMetrics(Map<String, Object> snapshot, Long branchId) {
        Map<String, Object> metrics = new LinkedHashMap<>();
        String branchFilter = branchId == null ? "" : " WHERE branch_id = ?";
        Object[] args = branchId == null ? new Object[]{} : new Object[]{branchId};
        putScalar(metrics, "stockItems", "SELECT COUNT(*) FROM Warehouse_stock" + branchFilter, args);
        putScalar(metrics, "lowStockItems", "SELECT COUNT(*) FROM Warehouse_stock WHERE quantity < min_quantity" + branchAnd(branchId), args);
        putScalar(metrics, "outOfStockItems", "SELECT COUNT(*) FROM Warehouse_stock WHERE quantity <= 0" + branchAnd(branchId), args);
        putScalar(metrics, "importsToday", "SELECT COUNT(*) FROM Stock_import WHERE DATE(imported_at) = CURRENT_DATE()" + branchAnd(branchId), args);
        putScalar(metrics, "exportsToday", "SELECT COUNT(*) FROM Stock_export WHERE DATE(exported_at) = CURRENT_DATE()" + fromBranchAnd(branchId), args);
        snapshot.put("warehouseMetrics", metrics);
    }

    private void addDeliveryMetrics(Map<String, Object> snapshot, Long branchId) {
        Map<String, Object> metrics = new LinkedHashMap<>();
        putScalar(metrics, "readyForDelivery", "SELECT COUNT(*) FROM Order_ WHERE status = 'ready' AND order_type = 'delivery' AND branch_id = ?", branchId);
        putScalar(metrics, "delivering", "SELECT COUNT(*) FROM Order_ WHERE status = 'delivering' AND branch_id = ?", branchId);
        putScalar(metrics, "completedToday", "SELECT COUNT(*) FROM Order_ WHERE DATE(updated_at) = CURRENT_DATE() AND status = 'completed' AND order_type = 'delivery' AND branch_id = ?", branchId);
        snapshot.put("deliveryMetrics", metrics);
    }

    private void addBranchInfo(Map<String, Object> snapshot, Long branchId) {
        if (branchId == null) {
            return;
        }
        putRows(snapshot, "branch", """
                SELECT branch_id branchId, branch_name branchName, address, phone, email, branch_type branchType, status
                FROM Branch
                WHERE branch_id = ?
                LIMIT 1
                """, branchId);
    }

    private void addReferenceData(Map<String, Object> snapshot) {
        putRows(snapshot, "productCategories", """
                SELECT p_category_id categoryId, p_category_name categoryName
                FROM Product_category
                ORDER BY p_category_name
                LIMIT 20
                """);
        putRows(snapshot, "activeProductTypes", """
                SELECT product_type productType, COUNT(*) productCount
                FROM Product
                WHERE status IS NULL OR status <> 'inactive'
                GROUP BY product_type
                ORDER BY productCount DESC
                LIMIT 20
                """);
    }

    private void addIngredientReferenceData(Map<String, Object> snapshot) {
        putRows(snapshot, "ingredientCategories", """
                SELECT i_category_id categoryId, i_category_name categoryName
                FROM Ingredient_category
                ORDER BY i_category_name
                LIMIT 20
                """);
    }

    private void addTopProducts(Map<String, Object> snapshot, Long branchId) {
        Object[] args = branchId == null ? new Object[]{} : new Object[]{branchId};
        putRows(snapshot, "topProductsToday", """
                SELECT d.product_id productId,
                       COALESCE(p.product_name, CONCAT('Product #', d.product_id)) productName,
                       SUM(d.quantity) quantity,
                       SUM(d.unit_price * d.quantity) revenue
                FROM Order_detail d
                JOIN Order_ o ON o.order_id = d.order_id
                LEFT JOIN Product p ON p.product_id = d.product_id
                WHERE DATE(o.created_at) = CURRENT_DATE()
                """ + branchAnd("o", branchId) + """
                GROUP BY d.product_id, p.product_name
                ORDER BY quantity DESC
                LIMIT ?
                """, append(args, MAX_ROWS));
    }

    private void addLowStock(Map<String, Object> snapshot, Long branchId) {
        Object[] args = branchId == null ? new Object[]{} : new Object[]{branchId};
        putRows(snapshot, "lowStock", """
                SELECT ws.stock_id stockId,
                       ws.branch_id branchId,
                       ws.ingredient_id ingredientId,
                       COALESCE(i.ingredient_name, CONCAT('Ingredient #', ws.ingredient_id)) ingredientName,
                       ws.quantity,
                       ws.min_quantity minQuantity,
                       ws.unit,
                       (ws.min_quantity - ws.quantity) shortage
                FROM Warehouse_stock ws
                LEFT JOIN Ingredient i ON i.ingredient_id = ws.ingredient_id
                WHERE ws.quantity < ws.min_quantity
                """ + branchAnd("ws", branchId) + """
                ORDER BY shortage DESC
                LIMIT ?
                """, append(args, MAX_ROWS));
    }

    private void addRecentOrders(Map<String, Object> snapshot, Long branchId, boolean includeAddress) {
        Object[] args = branchId == null ? new Object[]{} : new Object[]{branchId};
        String addressColumn = includeAddress ? ", cd.address customerAddress" : "";
        putRows(snapshot, "recentOrders", """
                SELECT o.order_id orderId,
                       o.branch_id branchId,
                       o.status,
                       o.order_type orderType,
                       o.created_at createdAt,
                       COALESCE(c.name, 'Khach vang lai') customerName,
                       cd.phone_number customerPhone,
                       COALESCE(p.amount, 0) amount,
                       COALESCE(item_count.itemCount, 0) itemCount
                       """ + addressColumn + """
                FROM Order_ o
                LEFT JOIN Customer c ON c.id = o.customer_id
                LEFT JOIN Customer_detail cd ON cd.customer_id = o.customer_id
                LEFT JOIN Payment p ON p.order_id = o.order_id
                LEFT JOIN (
                    SELECT order_id, SUM(quantity) itemCount
                    FROM Order_detail
                    GROUP BY order_id
                ) item_count ON item_count.order_id = o.order_id
                WHERE o.status IN ('pending','confirmed','preparing','ready','delivering')
                """ + branchAnd("o", branchId) + """
                ORDER BY o.created_at DESC
                LIMIT ?
                """, append(args, MAX_ROWS));
    }

    private void addDeliveryOrders(Map<String, Object> snapshot, Long branchId) {
        putRows(snapshot, "deliveryOrders", """
                SELECT o.order_id orderId,
                       o.status,
                       o.created_at createdAt,
                       COALESCE(c.name, 'Khach vang lai') customerName,
                       cd.phone_number customerPhone,
                       cd.address customerAddress,
                       COALESCE(p.amount, 0) amount
                FROM Order_ o
                LEFT JOIN Customer c ON c.id = o.customer_id
                LEFT JOIN Customer_detail cd ON cd.customer_id = o.customer_id
                LEFT JOIN Payment p ON p.order_id = o.order_id
                WHERE o.order_type = 'delivery'
                  AND o.status IN ('ready','delivering')
                  AND o.branch_id = ?
                ORDER BY o.created_at ASC
                LIMIT ?
                """, branchId, MAX_ROWS);
    }

    private void addInventoryMovements(Map<String, Object> snapshot, Long branchId) {
        Object[] args = branchId == null ? new Object[]{} : new Object[]{branchId};
        putRows(snapshot, "recentImports", """
                SELECT import_id importId, branch_id branchId, supplier_id supplierId, employee_id employeeId, total_amount totalAmount, imported_at importedAt
                FROM Stock_import
                """ + whereBranch(branchId) + """
                ORDER BY imported_at DESC
                LIMIT ?
                """, append(args, MAX_ROWS));
        putRows(snapshot, "recentExports", """
                SELECT export_id exportId, from_branch_id fromBranchId, to_branch_id toBranchId, employee_id employeeId, total_amount totalAmount, exported_at exportedAt
                FROM Stock_export
                """ + whereFromBranch(branchId) + """
                ORDER BY exported_at DESC
                LIMIT ?
                """, append(args, MAX_ROWS));
    }

    private void putScalar(Map<String, Object> target, String key, String sql, Object... args) {
        try {
            target.put(key, jdbcTemplate.queryForObject(sql, Long.class, args));
        } catch (Exception ex) {
            target.put(key, null);
        }
    }

    private void putRows(Map<String, Object> target, String key, String sql, Object... args) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, args);
            target.put(key, rows);
        } catch (Exception ex) {
            target.put(key, List.of());
        }
    }

    private boolean requiresBranchScope(String role) {
        return "branch_manager".equals(role) || "sales_staff".equals(role)
                || "warehouse_staff".equals(role) || "delivery_staff".equals(role);
    }

    private String whereBranch(Long branchId) {
        return branchId == null ? "" : " WHERE branch_id = ?";
    }

    private String whereFromBranch(Long branchId) {
        return branchId == null ? "" : " WHERE from_branch_id = ?";
    }

    private String branchAnd(Long branchId) {
        return branchId == null ? "" : " AND branch_id = ?";
    }

    private String fromBranchAnd(Long branchId) {
        return branchId == null ? "" : " AND from_branch_id = ?";
    }

    private String branchAnd(String alias, Long branchId) {
        return branchId == null ? "" : " AND " + alias + ".branch_id = ?";
    }

    private Object[] append(Object[] args, Object value) {
        Object[] next = new Object[args.length + 1];
        System.arraycopy(args, 0, next, 0, args.length);
        next[args.length] = value;
        return next;
    }

    private String fallbackAnswer(RoleProfile profile, String message, Map<String, Object> snapshot) {
        String normalized = normalizeText(message);
        StringBuilder answer = new StringBuilder();
        answer.append("Mình đang chạy ở chế độ rule-based vì chưa cấu hình AI provider hoặc provider không phản hồi. ");
        answer.append("Với vai trò ").append(profile.label).append(", mình chỉ dùng dữ liệu trong phạm vi: ");
        answer.append(profile.scope).append(".\n\n");
        appendSnapshotSummary(answer, profile, snapshot);
        answer.append("\n\n");
        if (normalized.contains("don") || normalized.contains("order") || normalized.contains("hang cho")) {
            answer.append("Gợi ý thao tác: ưu tiên đơn cũ nhất còn pending/confirmed, kiểm tra thanh toán, sau đó chuyển trạng thái đúng luồng pending -> confirmed -> preparing -> ready -> completed.");
        } else if (normalized.contains("kho") || normalized.contains("ton") || normalized.contains("nguyen lieu")) {
            answer.append("Gợi ý thao tác: xử lý các nguyên liệu trong lowStock trước, ưu tiên dòng có shortage lớn nhất rồi đối chiếu recentImports/recentExports.");
        } else if (normalized.contains("giao") || normalized.contains("ship") || normalized.contains("van chuyen")) {
            answer.append("Gợi ý thao tác: nhận đơn ready theo thứ tự tạo sớm nhất, gọi khách xác nhận địa chỉ, cập nhật delivering rồi completed khi giao xong.");
        } else if (normalized.contains("doanh thu") || normalized.contains("bao cao")) {
            answer.append("Gợi ý thao tác: so sánh ordersToday, revenueToday, cancelledToday và topProductsToday trước khi kết luận hiệu quả vận hành.");
        } else {
            answer.append("Bạn có thể hỏi về đơn cần ưu tiên, sản phẩm bán chạy, tồn kho thấp, giao hàng hoặc báo cáo theo quyền của vai trò này.");
        }
        return answer.toString();
    }

    private void appendSnapshotSummary(StringBuilder answer, RoleProfile profile, Map<String, Object> snapshot) {
        Object scopeWarning = snapshot.get("scopeWarning");
        if (scopeWarning != null) {
            answer.append("Dữ liệu hiện có: ").append(scopeWarning);
            return;
        }

        if ("admin".equals(profile.key)) {
            appendAdminSummary(answer, snapshot);
            return;
        }

        answer.append("Tóm tắt dữ liệu hiện có:\n");
        boolean hasLine = false;
        Map<String, Object> orderMetrics = mapValue(snapshot.get("orderMetrics"));
        if (!orderMetrics.isEmpty()) {
            answer.append("- Đơn hàng: ")
                    .append(formatNumber(firstPresent(orderMetrics, "ordersToday", "todayOrders"))).append(" đơn hôm nay, ")
                    .append(formatMoney(firstPresent(orderMetrics, "revenueToday", "todayRevenue"))).append(" doanh thu, ")
                    .append(formatNumber(orderMetrics.get("pendingOrders"))).append(" pending, ")
                    .append(formatNumber(orderMetrics.get("readyOrders"))).append(" ready.\n");
            hasLine = true;
        }

        Map<String, Object> warehouseMetrics = mapValue(snapshot.get("warehouseMetrics"));
        if (!warehouseMetrics.isEmpty()) {
            answer.append("- Tồn kho: ")
                    .append(formatNumber(warehouseMetrics.get("stockItems"))).append(" mặt hàng, ")
                    .append(formatNumber(warehouseMetrics.get("lowStockItems"))).append(" dưới mức tối thiểu, ")
                    .append(formatNumber(warehouseMetrics.get("outOfStockItems"))).append(" hết hàng.\n");
            hasLine = true;
        }

        Map<String, Object> deliveryMetrics = mapValue(snapshot.get("deliveryMetrics"));
        if (!deliveryMetrics.isEmpty()) {
            answer.append("- Giao hàng: ")
                    .append(formatNumber(deliveryMetrics.get("readyForDelivery"))).append(" đơn sẵn sàng giao, ")
                    .append(formatNumber(deliveryMetrics.get("delivering"))).append(" đơn đang giao, ")
                    .append(formatNumber(deliveryMetrics.get("completedToday"))).append(" hoàn tất hôm nay.\n");
            hasLine = true;
        }

        List<Map<String, Object>> lowStock = rowList(snapshot.get("lowStock"));
        if (!lowStock.isEmpty()) {
            answer.append("- Nguyên liệu cần chú ý: ").append(summarizeLowStock(lowStock, 3)).append(".\n");
            hasLine = true;
        }

        List<Map<String, Object>> topProducts = rowList(snapshot.get("topProductsToday"));
        if (!topProducts.isEmpty()) {
            answer.append("- Bán chạy hôm nay: ").append(summarizeProducts(topProducts, 3)).append(".\n");
            hasLine = true;
        }

        List<Map<String, Object>> recentOrders = rowList(snapshot.get("recentOrders"));
        if (recentOrders.isEmpty()) {
            recentOrders = rowList(snapshot.get("deliveryOrders"));
        }
        if (!recentOrders.isEmpty()) {
            answer.append("- Đơn cần theo dõi: ").append(summarizeOrders(recentOrders, 3)).append(".\n");
            hasLine = true;
        }

        if (!hasLine) {
            answer.append("- Chưa có dữ liệu vận hành đủ rõ để tổng hợp trong phạm vi vai trò này.\n");
        }
    }

    private void appendAdminSummary(StringBuilder answer, Map<String, Object> snapshot) {
        Map<String, Object> metrics = mapValue(snapshot.get("metrics"));
        List<Map<String, Object>> lowStock = rowList(snapshot.get("lowStock"));
        List<Map<String, Object>> topProducts = rowList(snapshot.get("topProductsToday"));
        List<Map<String, Object>> recentOrders = rowList(snapshot.get("recentOrders"));

        answer.append("Tóm tắt dữ liệu hiện có:\n");
        answer.append("- Hôm nay: ")
                .append(formatNumber(metrics.get("todayOrders"))).append(" đơn, doanh thu ")
                .append(formatMoney(metrics.get("todayRevenue"))).append(", ")
                .append(formatNumber(metrics.get("cancelledToday"))).append(" đơn hủy.\n");
        answer.append("- Đang xử lý: ")
                .append(formatNumber(metrics.get("pendingOrders"))).append(" pending, ")
                .append(formatNumber(metrics.get("readyOrders"))).append(" ready, ")
                .append(formatNumber(metrics.get("deliveringOrders"))).append(" đang giao.\n");

        Object lowStockCount = firstPresent(metrics, "lowStockItems");
        if (lowStock.isEmpty()) {
            answer.append("- Tồn kho thấp: ").append(formatNumber(lowStockCount)).append(" mặt hàng, chưa có danh sách chi tiết.\n");
        } else {
            answer.append("- Tồn kho thấp: ")
                    .append(formatNumber(lowStockCount == null ? lowStock.size() : lowStockCount))
                    .append(" mặt hàng; thiếu nhiều: ")
                    .append(summarizeLowStock(lowStock, 3)).append(".\n");
        }

        if (topProducts.isEmpty()) {
            answer.append("- Sản phẩm bán chạy hôm nay: chưa có dữ liệu đơn trong ngày.\n");
        } else {
            answer.append("- Sản phẩm bán chạy hôm nay: ").append(summarizeProducts(topProducts, 3)).append(".\n");
        }

        if (recentOrders.isEmpty()) {
            answer.append("- Đơn cần theo dõi: chưa có đơn pending/confirmed/preparing/ready/delivering.\n");
        } else {
            answer.append("- Đơn cần theo dõi: ").append(summarizeOrders(recentOrders, 3)).append(".\n");
        }
    }

    private String summarizeLowStock(List<Map<String, Object>> rows, int limit) {
        List<String> parts = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (parts.size() >= limit) break;
            String name = textValue(row.get("ingredientName"), textValue(row.get("name"), "Nguyên liệu"));
            String branch = textValue(row.get("branchId"), "");
            String unit = textValue(row.get("unit"), "");
            String shortage = formatNumber(row.get("shortage"));
            StringBuilder part = new StringBuilder(name).append(" thiếu ").append(shortage);
            if (!unit.isBlank()) {
                part.append(" ").append(unit);
            }
            if (!branch.isBlank()) {
                part.append(" tại CN ").append(branch);
            }
            parts.add(part.toString());
        }
        return String.join("; ", parts);
    }

    private String summarizeProducts(List<Map<String, Object>> rows, int limit) {
        List<String> parts = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (parts.size() >= limit) break;
            String name = textValue(row.get("productName"), textValue(row.get("name"), "Sản phẩm"));
            parts.add(name + " " + formatNumber(row.get("quantity")) + " ly");
        }
        return String.join("; ", parts);
    }

    private String summarizeOrders(List<Map<String, Object>> rows, int limit) {
        List<String> parts = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (parts.size() >= limit) break;
            String orderId = textValue(row.get("orderId"), textValue(row.get("id"), "?"));
            String branchId = textValue(row.get("branchId"), "");
            String status = textValue(row.get("status"), "chưa rõ");
            String amount = formatMoney(row.get("amount"));
            StringBuilder part = new StringBuilder("#").append(orderId).append(" ").append(status).append(", ").append(amount);
            if (!branchId.isBlank()) {
                part.append(", CN ").append(branchId);
            }
            parts.add(part.toString());
        }
        return String.join("; ", parts);
    }

    private Map<String, Object> mapValue(Object value) {
        if (!(value instanceof Map<?, ?> raw)) {
            return Map.of();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        raw.forEach((key, item) -> result.put(String.valueOf(key), item));
        return result;
    }

    private List<Map<String, Object>> rowList(Object value) {
        if (!(value instanceof List<?> rawRows)) {
            return List.of();
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object row : rawRows) {
            if (row instanceof Map<?, ?> raw) {
                Map<String, Object> normalized = new LinkedHashMap<>();
                raw.forEach((key, item) -> normalized.put(String.valueOf(key), item));
                rows.add(normalized);
            }
        }
        return rows;
    }

    private Object firstPresent(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            if (map.containsKey(key) && map.get(key) != null) {
                return map.get(key);
            }
        }
        return null;
    }

    private String textValue(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isBlank() ? fallback : text;
    }

    private String formatMoney(Object value) {
        return formatNumber(value) + "đ";
    }

    private String formatNumber(Object value) {
        BigDecimal number = toBigDecimal(value);
        if (number == null) {
            return value == null ? "0" : String.valueOf(value);
        }
        NumberFormat formatter = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
        formatter.setMaximumFractionDigits(2);
        return formatter.format(number);
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal number) {
            return number;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private List<String> suggestionsFor(RoleProfile profile) {
        return switch (profile.key) {
            case "admin" -> List.of("Tóm tắt vận hành hôm nay", "Có bất thường doanh thu không?", "Sản phẩm nào cần chú ý?");
            case "branch_manager" -> List.of("Chi nhánh đang có bao nhiêu đơn chờ?", "Nên ưu tiên đơn nào trước?", "Nguyên liệu nào sắp hết?");
            case "warehouse_manager", "warehouse_staff" -> List.of("Nguyên liệu nào sắp hết?", "Cần nhập gì trước?", "Tóm tắt rủi ro tồn kho");
            case "delivery_staff" -> List.of("Có đơn nào sẵn sàng giao?", "Đơn giao nào cần ưu tiên?", "Lưu ý khi liên hệ khách");
            default -> List.of("Đơn nào cần xử lý trước?", "Sản phẩm nào bán chạy hôm nay?", "Cách xử lý đơn khách muốn hủy");
        };
    }

    private RoleProfile profileFor(String role) {
        return switch (role) {
            case "admin" -> new RoleProfile("admin", "Quản trị viên", "toàn hệ thống, phân tích tổng hợp, cảnh báo vận hành, báo cáo doanh thu");
            case "branch_manager" -> new RoleProfile("branch_manager", "Quản lý chi nhánh", "đơn hàng, nhân viên, tồn kho và hiệu quả vận hành trong chi nhánh của mình");
            case "warehouse_manager" -> new RoleProfile("warehouse_manager", "Quản lý kho", "tồn kho, nguyên liệu, nhập xuất kho và rủi ro thiếu hàng");
            case "warehouse_staff" -> new RoleProfile("warehouse_staff", "Nhân viên kho", "tồn kho, nguyên liệu, nhập xuất kho và rủi ro thiếu hàng trong chi nhánh của mình");
            case "delivery_staff" -> new RoleProfile("delivery_staff", "Nhân viên giao hàng", "đơn giao hàng trong chi nhánh, trạng thái giao và thông tin liên hệ cần thiết");
            default -> new RoleProfile("sales_staff", "Nhân viên bán hàng", "POS, đơn hàng tại quầy, trạng thái bếp, thanh toán, mã giảm giá và chăm sóc khách tại chi nhánh");
        };
    }

    private String roleKey(String roleName) {
        String normalized = normalizeText(roleName).replace(' ', '_');
        String text = normalized.replace('_', ' ');
        if (normalized.equals("admin") || text.contains("quan tri")) return "admin";
        if (normalized.equals("warehouse_manager") || text.contains("quan ly kho")) return "warehouse_manager";
        if (normalized.equals("warehouse_staff") || text.contains("warehouse staff") || text.contains("nhan vien kho")) return "warehouse_staff";
        if (normalized.equals("branch_manager") || text.contains("quan ly chi nhanh") || text.contains("quan ly ban hang") || text.contains("sales manager")) return "branch_manager";
        if (normalized.equals("delivery_staff") || text.contains("nhan vien van chuyen") || text.contains("nhan vien giao hang") || text.contains("shipper")) return "delivery_staff";
        return "sales_staff";
    }

    private String normalizeText(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private String normalizeChatRole(String role) {
        String normalized = trimToEmpty(role).toLowerCase(Locale.ROOT);
        return "assistant".equals(normalized) ? "assistant" : "user";
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private record RoleProfile(String key, String label, String scope) {}

    public static class AssistantRequest {
        public String message;
        public Map<String, Object> context;
        public List<AssistantMessage> history = new ArrayList<>();
    }

    public static class AssistantMessage {
        public String role;
        public String content;
    }

    public static class AssistantResponse {
        public String answer;
        public String role;
        public String roleLabel;
        public String provider;
        public LocalDateTime generatedAt;
        public Map<String, Object> context;
        public List<String> suggestions;
    }
}
