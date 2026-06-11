package com.coffee.reportservice.controller;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.ApiResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasRole('admin')")
public class ReportController {
    private static final String[] PALETTE = {
            "#0F4761", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#EF4444", "#8B5CF6"
    };

    private final JdbcTemplate jdbcTemplate;

    public ReportController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/dashboard")
    public ApiResponse<?> dashboard(@RequestParam(required = false, defaultValue = "7") Integer days) {
        LocalDate today = LocalDate.now();
        int periodDays = normalizeDashboardDays(days);
        DateRange periodRange = new DateRange(today.minusDays(periodDays - 1L), today);
        DateRange previousPeriodRange = previousRange(periodRange);
        String periodLabel = dashboardPeriodLabel(periodDays);

        long periodRevenue = longValue(revenueTotals(periodRange, null).get("totalRevenue"));
        long previousRevenue = longValue(revenueTotals(previousPeriodRange, null).get("totalRevenue"));
        long periodOrders = orderCount(periodRange, null, null);
        long previousOrders = orderCount(previousPeriodRange, null, null);
        long newCustomers = scalarLong("SELECT COUNT(*) FROM Customer WHERE created_at IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?", args(periodRange));
        long previousNewCustomers = scalarLong("SELECT COUNT(*) FROM Customer WHERE created_at IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?", args(previousPeriodRange));
        long lowStockItems = scalarLong("SELECT COUNT(*) FROM Warehouse_stock WHERE quantity < min_quantity", List.of());

        return ApiResponse.success(map(
                "kpis", List.of(
                        map("title", "Doanh thu " + periodLabel, "value", money(periodRevenue), "change", pctChange(periodRevenue, previousRevenue), "positive", periodRevenue >= previousRevenue),
                        map("title", "Đơn hàng " + periodLabel, "value", String.valueOf(periodOrders), "change", pctChange(periodOrders, previousOrders), "positive", periodOrders >= previousOrders),
                        map("title", "Khách hàng mới " + periodLabel, "value", String.valueOf(newCustomers), "change", pctChange(newCustomers, previousNewCustomers), "positive", newCustomers >= previousNewCustomers),
                        map("title", "Nguyên liệu sắp hết", "value", String.valueOf(lowStockItems), "change", lowStockItems == 0 ? "0" : "+" + lowStockItems, "positive", lowStockItems == 0)
                ),
                "revenueData", dashboardRevenueData(periodRange),
                "branchData", dashboardBranchData(periodRange),
                "topProducts", dashboardTopProducts(periodRange),
                "recentOrders", recentOrders(),
                "warnings", dashboardWarnings(),
                "recentActivity", dashboardActivities()
        ));
    }

    @GetMapping("/revenue")
    public ApiResponse<?> revenue(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long branchId
    ) {
        DateRange range = dateRange(fromDate, toDate, 30);
        DateRange previous = previousRange(range);

        Map<String, Object> totals = revenueTotals(range, branchId);
        Map<String, Object> previousTotals = revenueTotals(previous, branchId);
        long revenue = longValue(totals.get("totalRevenue"));
        long orders = longValue(totals.get("totalOrders"));
        long previousRevenue = longValue(previousTotals.get("totalRevenue"));
        long previousOrders = longValue(previousTotals.get("totalOrders"));
        long aov = orders == 0 ? 0 : revenue / orders;
        long previousAov = previousOrders == 0 ? 0 : previousRevenue / previousOrders;

        Map<String, Object> payload = map(
                "kpis", List.of(
                        kpi("Tong doanh thu", money(revenue), pctChange(revenue, previousRevenue), revenue >= previousRevenue),
                        kpi("DT trung binh/ngay", money(revenue / Math.max(1, range.days())), pctChange(revenue / Math.max(1, range.days()), previousRevenue / Math.max(1, previous.days())), revenue >= previousRevenue),
                        kpi("So don hang", String.valueOf(orders), pctChange(orders, previousOrders), orders >= previousOrders),
                        kpi("Gia tri don TB", money(aov), pctChange(aov, previousAov), aov >= previousAov)
                ),
                "dailyRevenue", dailyRevenue(range, previous, branchId),
                "branchRevenue", branchRevenue(range),
                "channelData", channelRevenue(range, branchId),
                "hourRevenue", hourRevenue(range, branchId),
                "topProducts", topProducts(range, branchId)
        );

        return ApiResponse.success(payload);
    }

    @GetMapping("/revenue/by-branch")
    public ApiResponse<?> revenueByBranch(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        return ApiResponse.success(branchRevenue(dateRange(fromDate, toDate, 30)));
    }

    @GetMapping("/revenue/by-product")
    public ApiResponse<?> revenueByProduct(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long branchId
    ) {
        return ApiResponse.success(topProducts(dateRange(fromDate, toDate, 30), branchId));
    }

    @GetMapping("/inventory")
    public ApiResponse<?> inventory(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long branchId
    ) {
        DateRange range = dateRange(fromDate, toDate, 30);
        List<Map<String, Object>> ingredientTable = ingredientTable(range, branchId);
        List<Map<String, Object>> alerts = ingredientTable.stream()
                .filter(row -> doubleValue(row.get("close")) < doubleValue(row.get("min")))
                .map(row -> map(
                        "name", row.get("name"),
                        "current", row.get("close"),
                        "min", row.get("min"),
                        "unit", row.get("unit"),
                        "suggested", round1(Math.max(doubleValue(row.get("min")), doubleValue(row.get("min")) * 2 - doubleValue(row.get("close"))))
                ))
                .collect(Collectors.toList());

        long totalImport = scalarLong("""
                SELECT COALESCE(SUM(total_amount),0)
                FROM Stock_import
                WHERE imported_at IS NOT NULL AND DATE(imported_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "branch_id"), args(range, branchId));
        long totalExport = scalarLong("""
                SELECT COALESCE(SUM(total_amount),0)
                FROM Stock_export
                WHERE exported_at IS NOT NULL AND DATE(exported_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "from_branch_id"), args(range, branchId));
        long inventoryValue = scalarLong("""
                SELECT COALESCE(SUM(ws.quantity * COALESCE(cost.avgPrice,0)),0)
                FROM Warehouse_stock ws
                LEFT JOIN (
                    SELECT ingredient_id, AVG(unit_price) avgPrice
                    FROM Stock_import_detail
                    GROUP BY ingredient_id
                ) cost ON cost.ingredient_id = ws.ingredient_id
                WHERE 1 = 1
                """ + branchClause(branchId, "ws.branch_id"), branchOnlyArgs(branchId));

        return ApiResponse.success(map(
                "kpis", List.of(
                        map("label", "Tong gia tri nhap kho", "value", money(totalImport), "color", "text-green-600", "bg", "bg-green-50"),
                        map("label", "Tong gia tri xuat kho", "value", money(totalExport), "color", "text-orange-600", "bg", "bg-orange-50"),
                        map("label", "Gia tri ton kho", "value", money(inventoryValue), "color", "text-blue-600", "bg", "bg-blue-50"),
                        map("label", "NL duoi muc toi thieu", "value", String.valueOf(alerts.size()), "color", "text-red-600", "bg", "bg-red-50")
                ),
                "weeklyData", weeklyInventoryData(),
                "ingredientTable", ingredientTable,
                "alerts", alerts
        ));
    }

    @GetMapping("/orders")
    public ApiResponse<?> orders(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long branchId
    ) {
        DateRange range = dateRange(fromDate, toDate, 30);
        DateRange previous = previousRange(range);

        long totalOrders = orderCount(range, branchId, null);
        long previousOrders = orderCount(previous, branchId, null);
        long completed = orderCount(range, branchId, "completed");
        long previousCompleted = orderCount(previous, branchId, "completed");
        long cancelled = orderCount(range, branchId, "cancelled");
        long previousCancelled = orderCount(previous, branchId, "cancelled");
        long revenue = longValue(revenueTotals(range, branchId).get("totalRevenue"));
        long previousRevenue = longValue(revenueTotals(previous, branchId).get("totalRevenue"));
        long aov = totalOrders == 0 ? 0 : revenue / totalOrders;
        long previousAov = previousOrders == 0 ? 0 : previousRevenue / previousOrders;

        return ApiResponse.success(map(
                "kpis", List.of(
                        map("label", "Tong don hang", "value", String.valueOf(totalOrders), "change", pctChange(totalOrders, previousOrders), "positive", totalOrders >= previousOrders),
                        map("label", "Don hoan thanh", "value", String.valueOf(completed), "change", pctChange(completed, previousCompleted), "positive", completed >= previousCompleted),
                        map("label", "Don huy", "value", String.valueOf(cancelled), "change", pctChange(cancelled, previousCancelled), "positive", cancelled <= previousCancelled),
                        map("label", "Gia tri TB / don", "value", money(aov), "change", pctChange(aov, previousAov), "positive", aov >= previousAov)
                ),
                "dailyOrders", dailyOrders(range, branchId),
                "channelData", orderChannels(range, branchId),
                "statusData", statusData(range, branchId),
                "hourlyData", hourlyOrders(range, branchId),
                "topItems", topItems(range, previous, branchId),
                "branchData", orderBranchData(range)
        ));
    }

    @GetMapping("/customers")
    public ApiResponse<?> customers(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        DateRange range = dateRange(fromDate, toDate, 30);
        DateRange previous = previousRange(range);
        long total = scalarLong("SELECT COUNT(*) FROM Customer", List.of());
        long newCustomers = scalarLong("SELECT COUNT(*) FROM Customer WHERE created_at IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?", args(range));
        long previousNewCustomers = scalarLong("SELECT COUNT(*) FROM Customer WHERE created_at IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?", args(previous));
        long returning = scalarLong("""
                SELECT COUNT(*) FROM (
                    SELECT customer_id
                    FROM Order_
                    WHERE customer_id IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?
                    GROUP BY customer_id
                    HAVING COUNT(*) >= 2
                ) t
                """, args(range));
        long activeCustomers = scalarLong("""
                SELECT COUNT(DISTINCT customer_id)
                FROM Order_
                WHERE customer_id IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?
                """, args(range));
        long previousReturning = scalarLong("""
                SELECT COUNT(*) FROM (
                    SELECT customer_id
                    FROM Order_
                    WHERE customer_id IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?
                    GROUP BY customer_id
                    HAVING COUNT(*) >= 2
                ) t
                """, args(previous));
        long retention = activeCustomers == 0 ? 0 : Math.round(returning * 100.0 / activeCustomers);

        long issuedPoints = scalarLong("SELECT COALESCE(SUM(exp_point),0) FROM Customer_loyalty", List.of());
        long circulatingPoints = scalarLong("SELECT COALESCE(SUM(drips_point),0) FROM Customer_loyalty", List.of());
        long redeemedPoints = Math.max(0, issuedPoints - circulatingPoints);

        return ApiResponse.success(map(
                "kpis", List.of(
                        map("label", "Tong khach hang", "value", String.valueOf(total), "change", "+0%"),
                        map("label", "Khach moi trong ky", "value", String.valueOf(newCustomers), "change", pctChange(newCustomers, previousNewCustomers)),
                        map("label", "Khach quay lai", "value", String.valueOf(returning), "change", pctChange(returning, previousReturning)),
                        map("label", "Ty le giu chan", "value", retention + "%", "change", "+0%")
                ),
                "growthData", customerGrowth(),
                "tierData", customerTiers(),
                "frequencyData", customerFrequency(),
                "vipCustomers", vipCustomers(),
                "pointStats", List.of(
                        map("label", "Tong diem da phat", "value", number(issuedPoints) + " diem", "color", "text-blue-600"),
                        map("label", "Tong diem da doi", "value", number(redeemedPoints) + " diem", "color", "text-green-600"),
                        map("label", "Dang luu hanh", "value", number(circulatingPoints) + " diem", "color", "text-orange-600")
                )
        ));
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> excel() {
        byte[] bytes = "metric,value\nrevenue,0\n".getBytes(StandardCharsets.UTF_8);
        return download(bytes, "reports.csv", "text/csv");
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> pdf() {
        byte[] bytes = "Coffee Chain Report Export".getBytes(StandardCharsets.UTF_8);
        return download(bytes, "reports.pdf", MediaType.APPLICATION_PDF_VALUE);
    }

    private Map<String, Object> revenueTotals(DateRange range, Long branchId) {
        return jdbcTemplate.queryForMap("""
                SELECT COUNT(DISTINCT o.order_id) totalOrders,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) totalRevenue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                WHERE o.status = 'completed'
                  AND DATE(COALESCE(p.paid_at, o.created_at)) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id"), args(range, branchId).toArray());
    }

    private List<Map<String, Object>> dashboardRevenueData(DateRange range) {
        Map<LocalDate, Long> revenueByDate = revenueByDate(range, null);
        List<Map<String, Object>> orderRows = jdbcTemplate.queryForList("""
                SELECT DATE(created_at) orderDate, COUNT(*) orders
                FROM Order_
                WHERE DATE(created_at) BETWEEN ? AND ?
                GROUP BY orderDate
                """, args(range).toArray());
        Map<LocalDate, Long> ordersByDate = orderRows.stream()
                .collect(Collectors.toMap(row -> localDate(row.get("orderDate")), row -> longValue(row.get("orders"))));
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < range.days(); i++) {
            LocalDate date = range.from().plusDays(i);
            result.add(map(
                    "day", shortDate(date),
                    "revenue", revenueByDate.getOrDefault(date, 0L),
                    "orders", ordersByDate.getOrDefault(date, 0L)
            ));
        }
        return result;
    }

    private List<Map<String, Object>> dashboardBranchData(DateRange range) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(b.branch_name, CONCAT('Chi nhanh #', o.branch_id)) name,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) rawValue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                LEFT JOIN Branch b ON b.branch_id = o.branch_id
                WHERE o.status = 'completed'
                  AND DATE(COALESCE(p.paid_at, o.created_at)) BETWEEN ? AND ?
                GROUP BY o.branch_id, b.branch_name
                ORDER BY rawValue DESC
                LIMIT 6
                """, args(range).toArray());
        return percentRows(rows, "rawValue");
    }

    private List<Map<String, Object>> dashboardTopProducts(DateRange todayRange) {
        List<Map<String, Object>> rows = topProducts(todayRange, null);
        return rows.stream()
                .limit(5)
                .map(row -> map("name", row.get("name"), "qty", longValue(row.get("qty")), "revenue", money(longValue(row.get("revenue")))))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> recentOrders() {
        return jdbcTemplate.queryForList("""
                SELECT o.order_id id,
                       COALESCE(c.name, 'Khach vang lai') customer,
                       COALESCE(p.amount, 0) amount,
                       COALESCE(o.status, 'unknown') status,
                       COALESCE(b.branch_name, CONCAT('Chi nhanh #', o.branch_id)) branch
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                LEFT JOIN Customer c ON c.id = o.customer_id
                LEFT JOIN Branch b ON b.branch_id = o.branch_id
                ORDER BY o.created_at DESC
                LIMIT 6
                """).stream()
                .map(row -> map(
                        "id", "#" + row.get("id"),
                        "customer", row.get("customer"),
                        "amount", money(longValue(row.get("amount"))),
                        "status", orderStatusLabel(String.valueOf(row.get("status"))),
                        "branch", row.get("branch")
                ))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> dashboardWarnings() {
        List<Map<String, Object>> warnings = new ArrayList<>();
        List<Map<String, Object>> lowStock = jdbcTemplate.queryForList("""
                SELECT COALESCE(i.ingredient_name, CONCAT('Nguyen lieu #', ws.ingredient_id)) name,
                       ws.quantity,
                       ws.min_quantity,
                       ws.unit
                FROM Warehouse_stock ws
                LEFT JOIN Ingredient i ON i.ingredient_id = ws.ingredient_id
                WHERE ws.quantity < ws.min_quantity
                ORDER BY (ws.quantity / NULLIF(ws.min_quantity,0)) ASC
                LIMIT 3
                """);
        for (Map<String, Object> row : lowStock) {
            warnings.add(map(
                    "type", "danger",
                    "msg", row.get("name") + " dưới mức tối thiểu (" + round1(row.get("quantity")) + "/" + round1(row.get("min_quantity")) + " " + row.get("unit") + ")",
                    "time", "Vừa cập nhật"
            ));
        }

        long pendingOrders = scalarLong("SELECT COUNT(*) FROM Order_ WHERE status IN ('pending','confirmed','preparing') AND created_at < NOW() - INTERVAL '45 minutes'", List.of());
        if (pendingOrders > 0) {
            warnings.add(map("type", "warning", "msg", pendingOrders + " đơn đang xử lý quá 45 phút", "time", "Hôm nay"));
        }
        if (warnings.isEmpty()) {
            warnings.add(map("type", "warning", "msg", "Hệ thống đang hoạt động ổn định, chưa có cảnh báo nghiêm trọng", "time", "Hôm nay"));
        }
        return warnings;
    }

    private List<Map<String, Object>> dashboardActivities() {
        List<Map<String, Object>> activities = new ArrayList<>();
        jdbcTemplate.queryForList("""
                SELECT o.order_id id,
                       COALESCE(o.status, 'unknown') status,
                       COALESCE(c.name, 'Khach vang lai') customer,
                       o.created_at createdAt
                FROM Order_ o
                LEFT JOIN Customer c ON c.id = o.customer_id
                ORDER BY o.created_at DESC
                LIMIT 4
                """).forEach(row -> activities.add(map(
                "icon", "✓",
                "action", "Cập nhật đơn #" + row.get("id") + " - " + orderStatusLabel(String.valueOf(row.get("status"))),
                "user", row.get("customer"),
                "time", relativeTime(row.get("createdAt"))
        )));
        jdbcTemplate.queryForList("""
                SELECT import_id id, total_amount amount, imported_at createdAt
                FROM Stock_import
                WHERE imported_at IS NOT NULL
                ORDER BY imported_at DESC
                LIMIT 2
                """).forEach(row -> activities.add(map(
                "icon", "+",
                "action", "Nhập kho phiếu #" + row.get("id") + " trị giá " + money(longValue(row.get("amount"))),
                "user", "Kho",
                "time", relativeTime(row.get("createdAt"))
        )));
        if (activities.isEmpty()) {
            activities.add(map("icon", "•", "action", "Dashboard đã sẵn sàng nhận dữ liệu vận hành", "user", "Hệ thống", "time", "Hôm nay"));
        }
        return activities.stream().limit(6).collect(Collectors.toList());
    }

    private List<Map<String, Object>> dailyRevenue(DateRange range, DateRange previous, Long branchId) {
        Map<LocalDate, Long> current = revenueByDate(range, branchId);
        Map<LocalDate, Long> prev = revenueByDate(previous, branchId);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < range.days(); i++) {
            LocalDate date = range.from().plusDays(i);
            LocalDate prevDate = previous.from().plusDays(i);
            rows.add(map("date", shortDate(date), "revenue", current.getOrDefault(date, 0L), "prev", prev.getOrDefault(prevDate, 0L)));
        }
        return rows;
    }

    private Map<LocalDate, Long> revenueByDate(DateRange range, Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT DATE(COALESCE(p.paid_at, o.created_at)) saleDate,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) revenue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                WHERE o.status = 'completed'
                  AND DATE(COALESCE(p.paid_at, o.created_at)) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY saleDate
                ORDER BY saleDate
                """, args(range, branchId).toArray());
        return rows.stream().collect(Collectors.toMap(row -> localDate(row.get("saleDate")), row -> longValue(row.get("revenue"))));
    }

    private List<Map<String, Object>> branchRevenue(DateRange range) {
        return jdbcTemplate.queryForList("""
                SELECT COALESCE(b.branch_name, CONCAT('Chi nhanh #', o.branch_id)) branch,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) revenue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                LEFT JOIN Branch b ON b.branch_id = o.branch_id
                WHERE o.status = 'completed'
                  AND DATE(COALESCE(p.paid_at, o.created_at)) BETWEEN ? AND ?
                GROUP BY o.branch_id, b.branch_name
                ORDER BY revenue DESC
                LIMIT 8
                """, args(range).toArray());
    }

    private List<Map<String, Object>> channelRevenue(DateRange range, Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(NULLIF(o.order_type,''), 'unknown') name,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) rawValue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                WHERE DATE(o.created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY o.order_type
                ORDER BY rawValue DESC
                """, args(range, branchId).toArray());
        return percentRows(rows, "rawValue");
    }

    private List<Map<String, Object>> hourRevenue(DateRange range, Long branchId) {
        return jdbcTemplate.queryForList("""
                SELECT CONCAT(LPAD((EXTRACT(HOUR FROM COALESCE(p.paid_at, o.created_at))::int)::text, 2, '0'), 'h') hour,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) revenue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                WHERE o.status = 'completed'
                  AND DATE(COALESCE(p.paid_at, o.created_at)) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY EXTRACT(HOUR FROM COALESCE(p.paid_at, o.created_at))
                ORDER BY EXTRACT(HOUR FROM COALESCE(p.paid_at, o.created_at))
                """, args(range, branchId).toArray());
    }

    private List<Map<String, Object>> topProducts(DateRange range, Long branchId) {
        return jdbcTemplate.queryForList("""
                SELECT COALESCE(p.product_name, c.combo_name, CONCAT('Mon #', COALESCE(od.product_id, od.combo_id))) name,
                       COALESCE(SUM(od.unit_price * od.quantity),0) revenue,
                       COALESCE(SUM(od.quantity),0) qty
                FROM Order_detail od
                JOIN Order_ o ON o.order_id = od.order_id
                LEFT JOIN Product p ON p.product_id = od.product_id
                LEFT JOIN Combo c ON c.combo_id = od.combo_id
                WHERE o.status = 'completed'
                  AND DATE(o.created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY COALESCE(p.product_name, c.combo_name, CONCAT('Mon #', COALESCE(od.product_id, od.combo_id)))
                ORDER BY revenue DESC
                LIMIT 10
                """, args(range, branchId).toArray());
    }

    private List<Map<String, Object>> weeklyInventoryData() {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY).minusWeeks(7);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            LocalDate start = weekStart.plusWeeks(i);
            LocalDate end = start.plusDays(6);
            long imports = scalarLong("SELECT COALESCE(SUM(total_amount),0) FROM Stock_import WHERE imported_at IS NOT NULL AND DATE(imported_at) BETWEEN ? AND ?", args(start, end));
            long exports = scalarLong("SELECT COALESCE(SUM(total_amount),0) FROM Stock_export WHERE exported_at IS NOT NULL AND DATE(exported_at) BETWEEN ? AND ?", args(start, end));
            rows.add(map("week", shortDate(start), "import", imports, "export", exports));
        }
        return rows;
    }

    private List<Map<String, Object>> ingredientTable(DateRange range, Long branchId) {
        List<Object> queryArgs = new ArrayList<>();
        queryArgs.add(Date.valueOf(range.from()));
        queryArgs.add(Date.valueOf(range.to()));
        queryArgs.add(Date.valueOf(range.from()));
        queryArgs.add(Date.valueOf(range.to()));
        if (branchId != null) queryArgs.add(branchId);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(i.ingredient_name, CONCAT('Nguyen lieu #', ws.ingredient_id)) name,
                       COALESCE(ws.unit, i.unit, '') unit,
                       ws.quantity closeQty,
                       ws.min_quantity minQty,
                       COALESCE(im.importQty,0) importQty,
                       COALESCE(ex.exportQty,0) exportQty
                FROM Warehouse_stock ws
                LEFT JOIN Ingredient i ON i.ingredient_id = ws.ingredient_id
                LEFT JOIN (
                    SELECT sid.ingredient_id, si.branch_id, SUM(sid.quantity) importQty
                    FROM Stock_import_detail sid
                    JOIN Stock_import si ON si.import_id = sid.import_id
                    WHERE si.imported_at IS NOT NULL AND DATE(si.imported_at) BETWEEN ? AND ?
                    GROUP BY sid.ingredient_id, si.branch_id
                ) im ON im.ingredient_id = ws.ingredient_id AND im.branch_id = ws.branch_id
                LEFT JOIN (
                    SELECT sed.ingredient_id, se.from_branch_id branch_id, SUM(sed.quantity) exportQty
                    FROM Stock_export_detail sed
                    JOIN Stock_export se ON se.export_id = sed.export_id
                    WHERE se.exported_at IS NOT NULL AND DATE(se.exported_at) BETWEEN ? AND ?
                    GROUP BY sed.ingredient_id, se.from_branch_id
                ) ex ON ex.ingredient_id = ws.ingredient_id AND ex.branch_id = ws.branch_id
                WHERE 1 = 1
                """ + branchClause(branchId, "ws.branch_id") + """
                ORDER BY (ws.quantity / NULLIF(ws.min_quantity,0)) ASC, ws.quantity ASC
                LIMIT 100
                """, queryArgs.toArray());

        return rows.stream().map(row -> {
            double close = doubleValue(row.get("closeQty"));
            double imports = doubleValue(row.get("importQty"));
            double exports = doubleValue(row.get("exportQty"));
            return map(
                    "name", row.get("name"),
                    "unit", row.get("unit"),
                    "open", round1(close - imports + exports),
                    "import_", round1(imports),
                    "export_", round1(exports),
                    "close", round1(close),
                    "min", round1(row.get("minQty"))
            );
        }).collect(Collectors.toList());
    }

    private long orderCount(DateRange range, Long branchId, String status) {
        List<Object> queryArgs = args(range, branchId);
        String statusClause = "";
        if (status != null) {
            statusClause = " AND status = ?";
            queryArgs.add(status);
        }
        return scalarLong("""
                SELECT COUNT(*)
                FROM Order_
                WHERE DATE(created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "branch_id") + statusClause, queryArgs);
    }

    private List<Map<String, Object>> dailyOrders(DateRange range, Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT DATE(o.created_at) orderDate,
                       COUNT(*) orders,
                       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),0) revenue
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                WHERE DATE(o.created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "o.branch_id") + """
                GROUP BY orderDate
                ORDER BY orderDate
                """, args(range, branchId).toArray());
        Map<LocalDate, Map<String, Object>> byDate = rows.stream()
                .collect(Collectors.toMap(row -> localDate(row.get("orderDate")), row -> row));
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < range.days(); i++) {
            LocalDate date = range.from().plusDays(i);
            Map<String, Object> row = byDate.get(date);
            result.add(map(
                    "day", shortDate(date),
                    "orders", row == null ? 0 : longValue(row.get("orders")),
                    "revenue", row == null ? 0 : Math.round(longValue(row.get("revenue")) / 1_000_000.0)
            ));
        }
        return result;
    }

    private List<Map<String, Object>> orderChannels(DateRange range, Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(NULLIF(order_type,''), 'unknown') name, COUNT(*) rawValue
                FROM Order_
                WHERE DATE(created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "branch_id") + """
                GROUP BY order_type
                ORDER BY rawValue DESC
                """, args(range, branchId).toArray());
        return percentRows(rows, "rawValue");
    }

    private List<Map<String, Object>> statusData(DateRange range, Long branchId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(status, 'unknown') status, COUNT(*) value
                FROM Order_
                WHERE DATE(created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "branch_id") + """
                GROUP BY status
                ORDER BY value DESC
                """, args(range, branchId).toArray());
        return rows.stream()
                .map(row -> map("name", orderStatusLabel(String.valueOf(row.get("status"))), "value", longValue(row.get("value")), "color", statusColor(String.valueOf(row.get("status")))))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> hourlyOrders(DateRange range, Long branchId) {
        return jdbcTemplate.queryForList("""
                SELECT CONCAT(LPAD((EXTRACT(HOUR FROM created_at)::int)::text, 2, '0'), 'h') hour, COUNT(*) orders
                FROM Order_
                WHERE DATE(created_at) BETWEEN ? AND ?
                """ + branchClause(branchId, "branch_id") + """
                GROUP BY EXTRACT(HOUR FROM created_at)
                ORDER BY EXTRACT(HOUR FROM created_at)
                """, args(range, branchId).toArray());
    }

    private List<Map<String, Object>> topItems(DateRange range, DateRange previous, Long branchId) {
        List<Map<String, Object>> currentRows = itemSales(range, branchId, 10);
        Map<String, Long> previousQty = itemSales(previous, branchId, 200).stream()
                .collect(Collectors.toMap(row -> String.valueOf(row.get("itemKey")), row -> longValue(row.get("qty")), (a, b) -> a));
        return currentRows.stream()
                .map(row -> {
                    long qty = longValue(row.get("qty"));
                    long previousItemQty = previousQty.getOrDefault(String.valueOf(row.get("itemKey")), 0L);
                    return map(
                            "name", row.get("name"),
                            "orders", qty,
                            "revenue", money(longValue(row.get("revenue"))),
                            "growth", pctChange(qty, previousItemQty)
                    );
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> itemSales(DateRange range, Long branchId, int limit) {
        List<Object> queryArgs = args(range, branchId);
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

    private List<Map<String, Object>> orderBranchData(DateRange range) {
        return jdbcTemplate.queryForList("""
                SELECT COALESCE(b.branch_name, CONCAT('Chi nhanh #', o.branch_id)) branch,
                       COUNT(*) orders,
                       COALESCE(AVG(CASE WHEN p.status = 'paid' THEN p.amount ELSE NULL END),0) aov
                FROM Order_ o
                LEFT JOIN Payment p ON p.order_id = o.order_id
                LEFT JOIN Branch b ON b.branch_id = o.branch_id
                WHERE DATE(o.created_at) BETWEEN ? AND ?
                GROUP BY o.branch_id, b.branch_name
                ORDER BY orders DESC
                LIMIT 8
                """, args(range).toArray());
    }

    private List<Map<String, Object>> customerGrowth() {
        LocalDate start = LocalDate.now().withDayOfMonth(1).minusMonths(5);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT TO_CHAR(created_at, 'YYYY-MM') monthKey, COUNT(*) customers
                FROM Customer
                WHERE created_at IS NOT NULL AND DATE(created_at) >= ?
                GROUP BY monthKey
                ORDER BY monthKey
                """, Date.valueOf(start));
        Map<String, Long> byMonth = rows.stream().collect(Collectors.toMap(row -> String.valueOf(row.get("monthKey")), row -> longValue(row.get("customers"))));
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            LocalDate month = start.plusMonths(i);
            String key = month.toString().substring(0, 7);
            result.add(map("month", month.getMonthValue() + "/" + month.getYear(), "customers", byMonth.getOrDefault(key, 0L)));
        }
        return result;
    }

    private List<Map<String, Object>> customerTiers() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COALESCE(mr.rank_name, 'Chua xep hang') name,
                       COUNT(*) rawValue,
                       COALESCE(mr.color, '') color
                FROM Customer c
                LEFT JOIN Customer_loyalty cl ON cl.customer_id = c.id
                LEFT JOIN Membership_rank mr ON mr.rank_id = cl.rank_id
                GROUP BY mr.rank_id, mr.rank_name, mr.color
                ORDER BY rawValue DESC
                """);
        return percentRows(rows, "rawValue");
    }

    private List<Map<String, Object>> customerFrequency() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT
                    CASE
                        WHEN COALESCE(total_orders,0) <= 1 THEN 'Khach moi'
                        WHEN total_orders BETWEEN 2 AND 4 THEN 'Mua thua'
                        WHEN total_orders BETWEEN 5 AND 12 THEN 'Thuong xuyen'
                        ELSE 'VIP'
                    END customerGroup,
                    COALESCE(AVG(total_orders),0) freq,
                    COUNT(*) value
                FROM Customer_loyalty
                GROUP BY customerGroup
                ORDER BY freq
                """);
        return withColors(rows, "customerGroup", "freq", "value", "fill");
    }

    private List<Map<String, Object>> vipCustomers() {
        return jdbcTemplate.queryForList("""
                SELECT COALESCE(c.name, CONCAT('Khach #', cl.customer_id)) name,
                       COALESCE(mr.rank_name, 'Thanh vien') tier,
                       COALESCE(cl.exp_point, 0) points,
                       COALESCE(cl.total_money, 0) spendValue,
                       COALESCE(cl.total_orders, 0) orders
                FROM Customer_loyalty cl
                LEFT JOIN Customer c ON c.id = cl.customer_id
                LEFT JOIN Membership_rank mr ON mr.rank_id = cl.rank_id
                ORDER BY cl.total_money DESC, cl.total_orders DESC
                LIMIT 8
                """).stream()
                .map(row -> map(
                        "name", row.get("name"),
                        "tier", row.get("tier"),
                        "points", longValue(row.get("points")),
                        "spend", money(longValue(row.get("spendValue"))),
                        "orders", longValue(row.get("orders"))
                ))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> percentRows(List<Map<String, Object>> rows, String valueKey) {
        long total = rows.stream().mapToLong(row -> longValue(row.get(valueKey))).sum();
        if (total <= 0) return List.of();
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            result.add(map(
                    "name", row.get("name"),
                    "value", Math.round(longValue(row.get(valueKey)) * 100.0 / total),
                    "color", color(row.get("color"), i)
            ));
        }
        return result;
    }

    private List<Map<String, Object>> withColors(List<Map<String, Object>> rows, String nameKey, String valueKey, String countKey, String colorKey) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            result.add(map("group", row.get(nameKey), "freq", round1(row.get(valueKey)), "value", longValue(row.get(countKey)), colorKey, PALETTE[i % PALETTE.length]));
        }
        return result;
    }

    private Map<String, Object> kpi(String label, String value, String change, boolean positive) {
        return map("label", label, "value", value, "change", change, "positive", positive);
    }

    private int normalizeDashboardDays(Integer days) {
        int value = days == null ? 7 : days;
        if (value <= 1) return 1;
        if (value <= 7) return 7;
        return 30;
    }

    private String dashboardPeriodLabel(int days) {
        if (days == 1) return "hôm nay";
        if (days == 7) return "7 ngày";
        return "30 ngày";
    }

    private DateRange dateRange(LocalDate fromDate, LocalDate toDate, int defaultDays) {
        LocalDate end = toDate == null ? LocalDate.now() : toDate;
        LocalDate start = fromDate == null ? end.minusDays(defaultDays - 1L) : fromDate;
        validateRange(start, end);
        return new DateRange(start, end);
    }

    private DateRange previousRange(DateRange range) {
        LocalDate end = range.from().minusDays(1);
        return new DateRange(end.minusDays(range.days() - 1L), end);
    }

    private void validateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new BadRequestException("fromDate must be before toDate");
        }
        if (fromDate != null && toDate != null && ChronoUnit.MONTHS.between(fromDate, toDate) > 12) {
            throw new BadRequestException("Maximum query range is 12 months");
        }
    }

    private String branchClause(Long branchId, String column) {
        return branchId == null ? "" : " AND " + column + " = ?";
    }

    private List<Object> args(DateRange range) {
        return args(range.from(), range.to());
    }

    private List<Object> args(DateRange range, Long branchId) {
        List<Object> args = args(range.from(), range.to());
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
        return LocalDate.parse(String.valueOf(value));
    }

    private String shortDate(LocalDate date) {
        return date.getDayOfMonth() + "/" + date.getMonthValue();
    }

    private String relativeTime(Object value) {
        if (value == null) return "Vừa cập nhật";
        LocalDate date = localDate(value);
        long days = ChronoUnit.DAYS.between(date, LocalDate.now());
        if (days <= 0) return "Hôm nay";
        if (days == 1) return "Hôm qua";
        return days + " ngày trước";
    }

    private String pctChange(long current, long previous) {
        if (previous == 0) return current == 0 ? "0%" : "+100%";
        long pct = Math.round((current - previous) * 100.0 / previous);
        return (pct > 0 ? "+" : "") + pct + "%";
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
        return number(value) + " d";
    }

    private String number(long value) {
        return String.format(Locale.US, "%,d", value);
    }

    private String color(Object raw, int index) {
        String value = raw == null ? "" : String.valueOf(raw);
        return value.isBlank() ? PALETTE[index % PALETTE.length] : value;
    }

    private String orderStatusLabel(String status) {
        return switch (status == null ? "" : status.toLowerCase(Locale.ROOT)) {
            case "pending" -> "Cho xac nhan";
            case "confirmed" -> "Da xac nhan";
            case "preparing" -> "Dang pha che";
            case "ready" -> "San sang";
            case "delivering" -> "Dang giao";
            case "completed" -> "Hoan thanh";
            case "cancelled" -> "Da huy";
            default -> status == null ? "Khac" : status;
        };
    }

    private String statusColor(String status) {
        return switch (status == null ? "" : status.toLowerCase(Locale.ROOT)) {
            case "completed" -> "#10B981";
            case "cancelled" -> "#EF4444";
            case "preparing", "pending" -> "#F59E0B";
            case "ready", "confirmed" -> "#3B82F6";
            case "delivering" -> "#8B5CF6";
            default -> "#9CA3AF";
        };
    }

    private Map<String, Object> map(Object... entries) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < entries.length; i += 2) {
            map.put(String.valueOf(entries[i]), entries[i + 1]);
        }
        return map;
    }

    private ResponseEntity<byte[]> download(byte[] bytes, String filename, String contentType) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(bytes);
    }

    private record DateRange(LocalDate from, LocalDate to) {
        long days() {
            return ChronoUnit.DAYS.between(from, to) + 1L;
        }
    }
}
