package com.coffee.aiservice.controller;

import com.coffee.common.response.ApiResponse;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai")
@PreAuthorize("hasRole('admin')")
public class AiController {
    private static final String[] PALETTE = {
            "#0F4761", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#EF4444", "#8B5CF6"
    };

    private record DateRange(LocalDate from, LocalDate to) {}

    private final JdbcTemplate jdbcTemplate;

    public AiController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/dashboard")
    public ApiResponse<?> dashboard() {
        return ApiResponse.success(map(
                "message", dataReadiness(),
                "confidenceScore", confidenceScore(),
                "ordersLast30Days", scalarLong("SELECT COUNT(*) FROM Order_ WHERE DATE(created_at) >= CURRENT_DATE() - INTERVAL 30 DAY", List.of()),
                "lowStockItems", scalarLong("SELECT COUNT(*) FROM Warehouse_stock WHERE quantity < min_quantity", List.of())
        ));
    }

    @RequestMapping(value = "/demand-forecast", method = {RequestMethod.GET, RequestMethod.POST})
    public ApiResponse<?> demandForecast(
            @RequestParam(required = false, defaultValue = "7") int horizon,
            @RequestParam(required = false) Long branchId
    ) {
        int days = Math.max(7, Math.min(30, horizon));
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(29);

        List<Map<String, Object>> recentDaily = jdbcTemplate.queryForList("""
                SELECT DATE(created_at) day, COUNT(*) orders
                FROM Order_
                WHERE DATE(created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "branch_id") + """
                GROUP BY day
                ORDER BY day
                """, args(from, today, branchId).toArray());
        long totalOrders = recentDaily.stream().mapToLong(row -> longValue(row.get("orders"))).sum();
        double base = totalOrders == 0 ? 8D : totalOrders / 30.0;

        List<Map<String, Object>> forecastData = new ArrayList<>();
        for (int i = 1; i <= days; i++) {
            LocalDate date = today.plusDays(i);
            double weekendBoost = date.getDayOfWeek().getValue() >= 6 ? 1.18 : 1.0;
            long predicted = Math.max(1, Math.round(base * weekendBoost * (1 + i * 0.01)));
            forecastData.add(map(
                    "day", shortDate(date),
                    "predicted", predicted,
                    "low", Math.max(0, Math.round(predicted * 0.82)),
                    "high", Math.round(predicted * 1.18)
            ));
        }

        return ApiResponse.success(map(
                "message", dataReadiness(),
                "confidenceScore", confidenceScore(),
                "forecastData", forecastData,
                "topProducts", forecastTopProducts(branchId),
                "importRecs", stockRecommendations(branchId),
                "branches", branches()
        ));
    }

    @GetMapping("/stock-alerts")
    public ApiResponse<?> stockAlerts(@RequestParam(required = false) Long branchId) {
        return ApiResponse.success(stockRecommendations(branchId));
    }

    @RequestMapping(value = "/anomaly-detection", method = {RequestMethod.GET, RequestMethod.POST})
    public ApiResponse<?> anomalyDetection(@RequestParam(required = false) Long branchId) {
        List<Map<String, Object>> anomalies = new ArrayList<>();
        long lowStock = scalarLong("SELECT COUNT(*) FROM Warehouse_stock WHERE quantity < min_quantity" + branchClause(branchId, "branch_id"), branchOnlyArgs(branchId));
        if (lowStock > 0) {
            anomalies.add(map(
                    "id", anomalies.size() + 1,
                    "level", lowStock >= 5 ? "critical" : "warning",
                    "title", "Nguyen lieu duoi muc toi thieu",
                    "branch", branchId == null ? "Tat ca chi nhanh" : branchName(branchId),
                    "time", "Hom nay",
                    "desc", lowStock + " nguyen lieu dang thap hon muc toi thieu, can kiem tra ke hoach nhap kho.",
                    "status", "new"
            ));
        }

        long cancelledToday = scalarLong("""
                SELECT COUNT(*)
                FROM Order_
                WHERE status = 'cancelled' AND DATE(created_at) = CURRENT_DATE()
                """ + branchClause(branchId, "branch_id"), branchOnlyArgs(branchId));
        double avgCancelled = doubleValue(jdbcTemplate.queryForObject("""
                SELECT COALESCE(AVG(daily_count),0)
                FROM (
                    SELECT DATE(created_at) day, COUNT(*) daily_count
                    FROM Order_
                    WHERE status = 'cancelled'
                      AND DATE(created_at) BETWEEN CURRENT_DATE() - INTERVAL 7 DAY AND CURRENT_DATE() - INTERVAL 1 DAY
                """ + branchClause(branchId, "branch_id") + """
                    GROUP BY DATE(created_at)
                ) t
                """, Number.class, branchOnlyArgs(branchId).toArray()));
        if (cancelledToday > Math.max(3, avgCancelled * 1.8)) {
            anomalies.add(map(
                    "id", anomalies.size() + 1,
                    "level", "critical",
                    "title", "Don huy tang bat thuong",
                    "branch", branchId == null ? "Tat ca chi nhanh" : branchName(branchId),
                    "time", "Hom nay",
                    "desc", "So don huy hom nay la " + cancelledToday + ", cao hon nguong trung binh 7 ngay gan nhat.",
                    "status", "new"
            ));
        }

        long oldPending = scalarLong("""
                SELECT COUNT(*)
                FROM Order_
                WHERE status IN ('pending','confirmed','preparing')
                  AND created_at < NOW() - INTERVAL 45 MINUTE
                """ + branchClause(branchId, "branch_id"), branchOnlyArgs(branchId));
        if (oldPending > 0) {
            anomalies.add(map(
                    "id", anomalies.size() + 1,
                    "level", "info",
                    "title", "Don hang cho xu ly lau",
                    "branch", branchId == null ? "Tat ca chi nhanh" : branchName(branchId),
                    "time", "45 phut gan day",
                    "desc", oldPending + " don dang cho xu ly lau hon nguong van hanh.",
                    "status", "processing"
            ));
        }

        if (anomalies.isEmpty()) {
            anomalies.add(map(
                    "id", 1,
                    "level", "info",
                    "title", "Hoat dong on dinh",
                    "branch", branchId == null ? "Tat ca chi nhanh" : branchName(branchId),
                    "time", "Hom nay",
                    "desc", "Chua ghi nhan bat thuong lon trong don hang, doanh thu va ton kho.",
                    "status", "resolved"
            ));
        }

        return ApiResponse.success(map(
                "anomalies", anomalies,
                "chartData", anomalyChart(branchId),
                "confidenceScore", confidenceScore()
        ));
    }

    @GetMapping("/menu-trends")
    public ApiResponse<?> menuTrends(@RequestParam(required = false) Long branchId) {
        List<Map<String, Object>> top = itemSales(LocalDate.now().minusDays(29), LocalDate.now(), branchId, 5);
        List<String> keys = top.stream().map(row -> String.valueOf(row.get("name"))).toList();
        return ApiResponse.success(map(
                "trendData", menuTrendData(keys, branchId),
                "trendKeys", keys,
                "rising", productMomentum(true, branchId),
                "falling", productMomentum(false, branchId),
                "heatmapData", heatmap(branchId),
                "branchData", menuBranchData(keys),
                "branchKeys", keys
        ));
    }

    @GetMapping("/customer-behavior")
    public ApiResponse<?> customerBehavior() {
        List<Map<String, Object>> scatter = jdbcTemplate.queryForList("""
                SELECT COALESCE(c.name, CONCAT('Khach #', o.customer_id)) name,
                       COUNT(*) orders,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) spend,
                       MAX(o.created_at) lastOrder,
                       DATEDIFF(CURRENT_DATE(), DATE(MIN(o.created_at))) activeDays
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                LEFT JOIN Customer c ON c.id = o.customer_id
                WHERE o.customer_id IS NOT NULL
                GROUP BY o.customer_id, c.name
                ORDER BY spend DESC
                LIMIT 80
                """).stream().map(row -> {
                    long orders = longValue(row.get("orders"));
                    long spend = longValue(row.get("spend"));
                    long activeDays = Math.max(30, longValue(row.get("activeDays")));
                    double months = Math.max(1.0, activeDays / 30.0);
                    long aov = orders == 0 ? 0 : spend / orders;
                    double frequency = Math.round((orders / months) * 10.0) / 10.0;
                    return map(
                            "name", row.get("name"),
                            "x", frequency,
                            "y", aov,
                            "z", spend,
                            "group", customerGroup(frequency, aov, spend, row.get("lastOrder"))
                    );
                }).collect(Collectors.toList());

        return ApiResponse.success(map(
                "scatterData", scatter,
                "churnCustomers", churnCustomers()
        ));
    }

    @GetMapping("/product-revenue-analysis")
    public ApiResponse<?> productRevenueAnalysis(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long branchId
    ) {
        DateRange range = dateRange(fromDate, toDate, 30);
        List<Map<String, Object>> rows = itemSales(range.from(), range.to(), branchId, 50);
        List<Map<String, Object>> products = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            long revenue = longValue(row.get("revenue"));
            long cost = Math.round(revenue * 0.42);
            long profit = revenue - cost;
            long margin = revenue == 0 ? 0 : Math.round(profit * 100.0 / revenue);
            products.add(map(
                    "rank", i + 1,
                    "name", row.get("name"),
                    "qty", longValue(row.get("qty")),
                    "revenue", revenue,
                    "cost", cost,
                    "profit", profit,
                    "margin", margin
            ));
        }
        List<String> topNames = rows.stream().limit(5).map(row -> String.valueOf(row.get("name"))).toList();
        return ApiResponse.success(map(
                "products", products,
                "catData", categoryRevenue(range, branchId),
                "branchData", productBranchRevenue(topNames, range),
                "branchKeys", branchCodes(),
                "channelData", channelRevenue(range, branchId)
        ));
    }

    @GetMapping("/best-slow-products")
    public ApiResponse<?> bestSlowProducts(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long branchId
    ) {
        DateRange range = dateRange(fromDate, toDate, 30);
        DateRange previousRange = previousRange(range);
        List<Map<String, Object>> current = itemSales(range.from(), range.to(), branchId, 30);
        Map<String, Long> previous = itemSales(previousRange.from(), previousRange.to(), branchId, 200).stream()
                .collect(Collectors.toMap(row -> String.valueOf(row.get("itemKey")), row -> longValue(row.get("qty")), (a, b) -> a));
        long maxQty = Math.max(1, current.stream().mapToLong(row -> longValue(row.get("qty"))).max().orElse(1));
        List<Map<String, Object>> products = current.stream().map(row -> {
            long qty = longValue(row.get("qty"));
            long prev = previous.getOrDefault(String.valueOf(row.get("itemKey")), 0L);
            double share = Math.round(qty * 1000.0 / maxQty) / 10.0;
            double growth = prev == 0 ? (qty == 0 ? 0 : 12.0) : Math.round((qty - prev) * 1000.0 / prev) / 10.0;
            String quad = share >= 50 && growth >= 6 ? "star"
                    : share >= 50 ? "cash"
                    : growth >= 6 ? "question"
                    : "dog";
            return map(
                    "name", row.get("name"),
                    "x", share,
                    "y", Math.max(0, Math.min(16, growth)),
                    "revenue", Math.round(longValue(row.get("revenue")) / 1_000_000.0),
                    "quad", quad
            );
        }).collect(Collectors.toList());
        return ApiResponse.success(map(
                "products", products,
                "recommendations", recommendations(products)
        ));
    }

    private List<Map<String, Object>> branches() {
        return jdbcTemplate.queryForList("""
                SELECT branch_id id, branch_name name
                FROM Branch
                WHERE status IS NULL OR LOWER(status) <> 'deleted'
                ORDER BY branch_name
                """);
    }

    private List<Map<String, Object>> forecastTopProducts(Long branchId) {
        Map<String, Long> previous = itemSales(LocalDate.now().minusDays(59), LocalDate.now().minusDays(30), branchId, 200).stream()
                .collect(Collectors.toMap(row -> String.valueOf(row.get("itemKey")), row -> longValue(row.get("qty")), (a, b) -> a));
        return itemSales(LocalDate.now().minusDays(29), LocalDate.now(), branchId, 8).stream()
                .map(row -> map(
                        "name", row.get("name"),
                        "qty", Math.max(1, Math.round(longValue(row.get("qty")) / 30.0 * 7)),
                        "change", pctChange(longValue(row.get("qty")), previous.getOrDefault(String.valueOf(row.get("itemKey")), 0L))
                ))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> stockRecommendations(Long branchId) {
        return jdbcTemplate.queryForList("""
                SELECT COALESCE(i.ingredient_name, CONCAT('Nguyen lieu #', ws.ingredient_id)) name,
                       ws.quantity current,
                       ws.min_quantity minQty,
                       ws.unit unit
                FROM Warehouse_stock ws
                LEFT JOIN Ingredient i ON i.ingredient_id = ws.ingredient_id
                WHERE ws.quantity < ws.min_quantity
                """ + branchClause(branchId, "ws.branch_id") + """
                ORDER BY (ws.quantity / NULLIF(ws.min_quantity,0)) ASC
                LIMIT 12
                """, branchOnlyArgs(branchId).toArray()).stream()
                .map(row -> {
                    double current = doubleValue(row.get("current"));
                    double min = doubleValue(row.get("minQty"));
                    return map(
                            "name", row.get("name"),
                            "current", round1(current),
                            "suggested", round1(Math.max(min, min * 2 - current)),
                            "unit", row.get("unit")
                    );
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> anomalyChart(Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT DATE(o.created_at) day,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) revenue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                WHERE DATE(o.created_at) BETWEEN CURRENT_DATE() - INTERVAL 13 DAY AND CURRENT_DATE()
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY day
                ORDER BY day
                """, branchOnlyArgs(branchId).toArray());
        long average = rows.isEmpty() ? 0 : Math.round(rows.stream().mapToLong(row -> longValue(row.get("revenue"))).average().orElse(0));
        return rows.stream()
                .map(row -> map("time", shortDate(localDate(row.get("day"))), "actual", Math.round(longValue(row.get("revenue")) / 1_000_000.0), "baseline", Math.round(average / 1_000_000.0)))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> menuTrendData(List<String> keys, Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT DATE(o.created_at) day,
                       COALESCE(p.product_name, c.combo_name, CONCAT('Mon #', COALESCE(od.product_id, od.combo_id))) name,
                       SUM(od.quantity) qty
                FROM Order_detail od
                JOIN Order_ o ON o.order_id = od.order_id
                LEFT JOIN Product p ON p.product_id = od.product_id
                LEFT JOIN Combo c ON c.combo_id = od.combo_id
                WHERE DATE(o.created_at) BETWEEN CURRENT_DATE() - INTERVAL 13 DAY AND CURRENT_DATE()
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY day, name
                ORDER BY day
                """, branchOnlyArgs(branchId).toArray());
        Map<LocalDate, Map<String, Object>> byDay = new LinkedHashMap<>();
        for (int i = 13; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            Map<String, Object> row = map("date", shortDate(day));
            keys.forEach(key -> row.put(key, 0));
            byDay.put(day, row);
        }
        for (Map<String, Object> row : rows) {
            LocalDate day = localDate(row.get("day"));
            String name = String.valueOf(row.get("name"));
            if (byDay.containsKey(day) && keys.contains(name)) {
                byDay.get(day).put(name, longValue(row.get("qty")));
            }
        }
        return new ArrayList<>(byDay.values());
    }

    private List<Map<String, Object>> productMomentum(boolean rising, Long branchId) {
        Map<String, Long> previous = itemSales(LocalDate.now().minusDays(59), LocalDate.now().minusDays(30), branchId, 200).stream()
                .collect(Collectors.toMap(row -> String.valueOf(row.get("itemKey")), row -> longValue(row.get("qty")), (a, b) -> a));
        return itemSales(LocalDate.now().minusDays(29), LocalDate.now(), branchId, 30).stream()
                .map(row -> {
                    String change = pctChange(longValue(row.get("qty")), previous.getOrDefault(String.valueOf(row.get("itemKey")), 0L));
                    long score = parsePercent(change);
                    return map("name", row.get("name"), "change", change, "score", score);
                })
                .filter(row -> rising ? longValue(row.get("score")) >= 0 : longValue(row.get("score")) < 0)
                .sorted((a, b) -> rising ? Long.compare(longValue(b.get("score")), longValue(a.get("score"))) : Long.compare(longValue(a.get("score")), longValue(b.get("score"))))
                .limit(5)
                .map(row -> map("name", row.get("name"), "change", row.get("change")))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> heatmap(Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT WEEKDAY(created_at) dayIdx,
                       FLOOR(HOUR(created_at) / 2) * 2 hourBucket,
                       COUNT(*) value
                FROM Order_
                WHERE DATE(created_at) BETWEEN CURRENT_DATE() - INTERVAL 30 DAY AND CURRENT_DATE()
                """ + branchClause(branchId, "branch_id") + """
                GROUP BY dayIdx, hourBucket
                """, branchOnlyArgs(branchId).toArray());
        return rows.stream()
                .filter(row -> longValue(row.get("hourBucket")) >= 6 && longValue(row.get("hourBucket")) < 22)
                .map(row -> map(
                        "day", longValue(row.get("dayIdx")),
                        "hour", Math.max(0, (longValue(row.get("hourBucket")) - 6) / 2),
                        "value", longValue(row.get("value"))
                ))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> menuBranchData(List<String> keys) {
        List<Map<String, Object>> branchRows = branches();
        List<Map<String, Object>> sales = jdbcTemplate.queryForList("""
                SELECT COALESCE(b.branch_name, CONCAT('Chi nhanh #', o.branch_id)) branch,
                       COALESCE(p.product_name, c.combo_name, CONCAT('Mon #', COALESCE(od.product_id, od.combo_id))) name,
                       SUM(od.quantity) qty
                FROM Order_detail od
                JOIN Order_ o ON o.order_id = od.order_id
                LEFT JOIN Branch b ON b.branch_id = o.branch_id
                LEFT JOIN Product p ON p.product_id = od.product_id
                LEFT JOIN Combo c ON c.combo_id = od.combo_id
                WHERE DATE(o.created_at) BETWEEN CURRENT_DATE() - INTERVAL 30 DAY AND CURRENT_DATE()
                GROUP BY branch, name
                """);
        List<Map<String, Object>> result = branchRows.stream()
                .map(row -> {
                    Map<String, Object> item = map("branch", row.get("name"));
                    keys.forEach(key -> item.put(key, 0));
                    return item;
                })
                .collect(Collectors.toList());
        Map<String, Map<String, Object>> byBranch = result.stream().collect(Collectors.toMap(row -> String.valueOf(row.get("branch")), row -> row, (a, b) -> a));
        for (Map<String, Object> row : sales) {
            String branch = String.valueOf(row.get("branch"));
            String name = String.valueOf(row.get("name"));
            if (byBranch.containsKey(branch) && keys.contains(name)) {
                byBranch.get(branch).put(name, longValue(row.get("qty")));
            }
        }
        return result;
    }

    private List<Map<String, Object>> churnCustomers() {
        return jdbcTemplate.queryForList("""
                SELECT COALESCE(c.name, CONCAT('Khach #', o.customer_id)) name,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) spend,
                       MAX(o.created_at) lastOrder
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                LEFT JOIN Customer c ON c.id = o.customer_id
                WHERE o.customer_id IS NOT NULL
                GROUP BY o.customer_id, c.name
                HAVING DATE(lastOrder) < CURRENT_DATE() - INTERVAL 21 DAY
                ORDER BY spend DESC
                LIMIT 10
                """).stream()
                .map(row -> {
                    LocalDate last = localDate(row.get("lastOrder"));
                    long days = ChronoUnit.DAYS.between(last, LocalDate.now());
                    long risk = Math.min(98, 45 + days);
                    return map(
                            "name", row.get("name"),
                            "risk", risk,
                            "lastOrder", days + " ngay truoc",
                            "totalSpend", money(longValue(row.get("spend")))
                    );
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> categoryRevenue(DateRange range, Long branchId) {
        List<Object> queryArgs = args(range.from(), range.to(), branchId);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(pc.p_category_name, 'Khac') name,
                       COALESCE(SUM(od.unit_price * od.quantity),0) rawValue
                FROM Order_detail od
                JOIN Order_ o ON o.order_id = od.order_id
                LEFT JOIN Product p ON p.product_id = od.product_id
                LEFT JOIN Product_category pc ON pc.p_category_id = p.p_category_id
                WHERE DATE(o.created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY pc.p_category_id, pc.p_category_name
                ORDER BY rawValue DESC
                """, queryArgs.toArray());
        return percentRows(rows, "rawValue");
    }

    private List<Map<String, Object>> productBranchRevenue(List<String> productNames, DateRange range) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(p.product_name, c.combo_name, CONCAT('Mon #', COALESCE(od.product_id, od.combo_id))) product,
                       COALESCE(b.branch_name, CONCAT('Chi nhanh #', o.branch_id)) branch,
                       COALESCE(SUM(od.unit_price * od.quantity),0) revenue
                FROM Order_detail od
                JOIN Order_ o ON o.order_id = od.order_id
                LEFT JOIN Branch b ON b.branch_id = o.branch_id
                LEFT JOIN Product p ON p.product_id = od.product_id
                LEFT JOIN Combo c ON c.combo_id = od.combo_id
                WHERE DATE(o.created_at) BETWEEN ? AND ?
                GROUP BY product, branch
                """, args(range.from(), range.to()).toArray());
        Map<String, Map<String, Object>> byProduct = new LinkedHashMap<>();
        productNames.forEach(name -> {
            Map<String, Object> row = map("product", name);
            branchCodes().forEach(code -> row.put(code, 0));
            byProduct.put(name, row);
        });
        for (Map<String, Object> row : rows) {
            String product = String.valueOf(row.get("product"));
            if (!byProduct.containsKey(product)) continue;
            String code = branchCode(String.valueOf(row.get("branch")));
            byProduct.get(product).put(code, Math.round(longValue(row.get("revenue")) / 1_000_000.0));
        }
        return new ArrayList<>(byProduct.values());
    }

    private List<String> branchCodes() {
        return branches().stream().map(row -> branchCode(String.valueOf(row.get("name")))).limit(6).toList();
    }

    private List<Map<String, Object>> channelRevenue(DateRange range, Long branchId) {
        List<Object> queryArgs = args(range.from(), range.to(), branchId);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(NULLIF(o.order_type,''), 'unknown') name,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) rawValue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                WHERE DATE(o.created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY o.order_type
                """, queryArgs.toArray());
        return percentRows(rows, "rawValue");
    }

    private List<Map<String, Object>> itemSales(LocalDate from, LocalDate to, Long branchId, int limit) {
        List<Object> queryArgs = args(from, to, branchId);
        queryArgs.add(limit);
        return jdbcTemplate.queryForList("""
                SELECT CASE WHEN od.product_id IS NOT NULL THEN CONCAT('P', od.product_id) ELSE CONCAT('C', od.combo_id) END itemKey,
                       COALESCE(p.product_name, c.combo_name, CONCAT('Mon #', COALESCE(od.product_id, od.combo_id))) name,
                       COALESCE(SUM(od.quantity),0) qty,
                       COALESCE(SUM(od.unit_price * od.quantity),0) revenue
                FROM Order_detail od
                JOIN Order_ o ON o.order_id = od.order_id
                LEFT JOIN Product p ON p.product_id = od.product_id
                LEFT JOIN Combo c ON c.combo_id = od.combo_id
                WHERE DATE(o.created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY itemKey, name
                ORDER BY qty DESC
                LIMIT ?
                """, queryArgs.toArray());
    }

    private Map<String, List<Map<String, Object>>> recommendations(List<Map<String, Object>> products) {
        Map<String, List<Map<String, Object>>> recs = new LinkedHashMap<>();
        recs.put("star", List.of(
                map("action", "Tang ton kho va hien thi noi bat", "detail", "Nhom nay vua ban tot vua tang nhanh, nen uu tien nguyen lieu va vi tri menu."),
                map("action", "Giu chat luong on dinh", "detail", "Theo doi danh gia va thoi gian pha che de tranh giam trai nghiem.")
        ));
        recs.put("cash", List.of(
                map("action", "Toi uu bien loi nhuan", "detail", "San pham on dinh, co the toi uu gia von va combo ban kem."),
                map("action", "Duy tri khuyen mai nhe", "detail", "Khong can giam sau, uu tien bundle co bien loi nhuan tot.")
        ));
        recs.put("question", List.of(
                map("action", "Thu nghiem chien dich day ban", "detail", "Tang hien thi trong 7-14 ngay de xac dinh kha nang thanh san pham chu luc."),
                map("action", "Theo doi ton kho sat", "detail", "Tang nhanh nhung thi phan con thap, nhap bo sung theo dot nho.")
        ));
        recs.put("dog", List.of(
                map("action", "Giam do uu tien tren menu", "detail", "Nhom tang thap va thi phan thap, nen xem xet thay cong thuc hoac tam an."),
                map("action", "Gom vao combo xa hang", "detail", "Dung combo gio thap diem de giai phong ton kho neu can.")
        ));
        return recs;
    }

    private List<Map<String, Object>> percentRows(List<Map<String, Object>> rows, String valueKey) {
        long total = rows.stream().mapToLong(row -> longValue(row.get(valueKey))).sum();
        if (total <= 0) return List.of();
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            result.add(map("name", row.get("name"), "value", Math.round(longValue(row.get(valueKey)) * 100.0 / total), "color", PALETTE[i % PALETTE.length]));
        }
        return result;
    }

    private String dataReadiness() {
        Integer days = jdbcTemplate.queryForObject("SELECT COUNT(DISTINCT DATE(created_at)) FROM Order_", Integer.class);
        return days == null || days < 30
                ? "Du lieu duoi 30 ngay; dang dung mo hinh thong ke/rule-based"
                : "Du du lieu lich su cho phan tich thong ke";
    }

    private double confidenceScore() {
        long days = scalarLong("SELECT COUNT(DISTINCT DATE(created_at)) FROM Order_", List.of());
        if (days >= 60) return 0.87;
        if (days >= 30) return 0.78;
        return 0.64;
    }

    private DateRange dateRange(LocalDate fromDate, LocalDate toDate, int defaultDays) {
        LocalDate end = toDate == null ? LocalDate.now() : toDate;
        LocalDate start = fromDate == null ? end.minusDays(defaultDays - 1L) : fromDate;
        if (start.isAfter(end)) {
            LocalDate swap = start;
            start = end;
            end = swap;
        }
        return new DateRange(start, end);
    }

    private DateRange previousRange(DateRange range) {
        long days = ChronoUnit.DAYS.between(range.from(), range.to()) + 1L;
        LocalDate previousEnd = range.from().minusDays(1L);
        return new DateRange(previousEnd.minusDays(days - 1L), previousEnd);
    }

    private String branchClause(Long branchId, String column) {
        return branchId == null ? "" : " AND " + column + " = ?";
    }

    private List<Object> args(LocalDate from, LocalDate to, Long branchId) {
        List<Object> args = args(from, to);
        if (branchId != null) args.add(branchId);
        return args;
    }

    private List<Object> args(LocalDate from, LocalDate to) {
        List<Object> args = new ArrayList<>();
        args.add(Date.valueOf(from));
        args.add(Date.valueOf(to));
        return args;
    }

    private List<Object> branchOnlyArgs(Long branchId) {
        return branchId == null ? List.of() : List.of(branchId);
    }

    private long scalarLong(String sql, List<Object> args) {
        Number value = jdbcTemplate.queryForObject(sql, Number.class, args.toArray());
        return value == null ? 0L : value.longValue();
    }

    private long longValue(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value == null) return 0L;
        return Long.parseLong(String.valueOf(value));
    }

    private double doubleValue(Object value) {
        if (value instanceof Number number) return number.doubleValue();
        if (value == null) return 0D;
        return Double.parseDouble(String.valueOf(value));
    }

    private double round1(Object value) {
        return Math.round(doubleValue(value) * 10.0) / 10.0;
    }

    private LocalDate localDate(Object value) {
        if (value instanceof LocalDate localDate) return localDate;
        if (value instanceof Date date) return date.toLocalDate();
        if (value instanceof Timestamp timestamp) return timestamp.toLocalDateTime().toLocalDate();
        return LocalDate.parse(String.valueOf(value).substring(0, 10));
    }

    private String shortDate(LocalDate date) {
        return date.getDayOfMonth() + "/" + date.getMonthValue();
    }

    private String branchName(Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT branch_name FROM Branch WHERE branch_id = ? LIMIT 1", branchId);
        return rows.isEmpty() ? "Chi nhanh #" + branchId : String.valueOf(rows.get(0).get("branch_name"));
    }

    private String branchCode(String name) {
        String[] words = name.replaceAll("[^\\p{L}\\p{N} ]", " ").trim().split("\\s+");
        StringBuilder code = new StringBuilder();
        for (String word : words) {
            if (!word.isBlank() && code.length() < 3) code.append(Character.toUpperCase(word.charAt(0)));
        }
        return code.isEmpty() ? "CN" : code.toString();
    }

    private String customerGroup(double frequency, long aov, long spend, Object lastOrderValue) {
        LocalDate lastOrder = lastOrderValue == null ? LocalDate.now() : localDate(lastOrderValue);
        long daysSinceLast = ChronoUnit.DAYS.between(lastOrder, LocalDate.now());
        if (daysSinceLast > 30) return "churn";
        if (frequency >= 4 || spend >= 3_000_000L) return "loyal";
        if (frequency <= 1.2) return "sparse";
        return "new";
    }

    private String pctChange(long current, long previous) {
        if (previous == 0) return current == 0 ? "0%" : "+100%";
        long pct = Math.round((current - previous) * 100.0 / previous);
        return (pct > 0 ? "+" : "") + pct + "%";
    }

    private long parsePercent(String value) {
        String cleaned = value.replace("%", "").replace("+", "").trim();
        return cleaned.isBlank() ? 0 : Long.parseLong(cleaned);
    }

    private String money(long value) {
        if (Math.abs(value) >= 1_000_000_000L) {
            return String.format(Locale.US, "%.1fB d", value / 1_000_000_000.0);
        }
        if (Math.abs(value) >= 1_000_000L) {
            return String.format(Locale.US, "%.1fM d", value / 1_000_000.0);
        }
        if (Math.abs(value) >= 1_000L) {
            return String.format(Locale.US, "%.0fK d", value / 1_000.0);
        }
        return String.format(Locale.US, "%,d d", value);
    }

    private Map<String, Object> map(Object... entries) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < entries.length; i += 2) {
            map.put(String.valueOf(entries[i]), entries[i + 1]);
        }
        return map;
    }
}
