package com.coffee.aiservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.text.Normalizer;
import java.text.NumberFormat;
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
public class CustomerAssistantService {
    private static final int MAX_PRODUCTS = 80;
    private static final int MAX_REFERENCE_ROWS = 40;
    private static final long MIN_PUBLIC_PRODUCT_PRICE = 5_000L;
    private static final long MAX_PUBLIC_PRODUCT_PRICE = 200_000L;
    private static final long MIN_PUBLIC_COMBO_PRICE = 10_000L;
    private static final long MAX_PUBLIC_COMBO_PRICE = 500_000L;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final String providerUrl;
    private final String apiKey;
    private final String model;

    public CustomerAssistantService(JdbcTemplate jdbcTemplate,
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

    public CustomerAssistantResponse chat(CustomerAssistantRequest request) {
        String message = request == null ? "" : trimToEmpty(request.message);
        if (message.isBlank()) {
            throw new IllegalArgumentException("message is required");
        }

        String socialAnswer = socialAnswer(message);
        if (!socialAnswer.isBlank()) {
            return directResponse(socialAnswer);
        }

        if (isOutsideCoffeeScope(normalizeText(message))) {
            return directResponse(outsideScopeAnswer());
        }

        Map<String, Object> database = buildDatabase();
        String systemPrompt = buildSystemPrompt(database);
        String answer = callProvider(systemPrompt, message, request == null ? List.of() : request.history);
        boolean providerUsed = !answer.isBlank();
        if (!providerUsed) {
            answer = fallbackAnswer(message, database);
        }

        CustomerAssistantResponse response = new CustomerAssistantResponse();
        response.answer = answer;
        response.provider = providerUsed ? "configured_ai_provider" : "rule_based";
        response.generatedAt = LocalDateTime.now();
        response.database = database;
        response.suggestions = suggestionLabels(products(database), message);
        return response;
    }

    private CustomerAssistantResponse directResponse(String answer) {
        CustomerAssistantResponse response = new CustomerAssistantResponse();
        response.answer = answer;
        response.provider = "rule_based";
        response.generatedAt = LocalDateTime.now();
        response.database = Map.of();
        response.suggestions = defaultSuggestionLabels();
        return response;
    }

    private Map<String, Object> buildDatabase() {
        Map<String, Object> database = new LinkedHashMap<>();
        List<Map<String, Object>> productRows = queryRows("products", """
                SELECT p.product_id productId,
                       p.product_name productName,
                       p.description,
                       p.base_price basePrice,
                       p.product_type productType,
                       pc.p_category_name categoryName,
                       GROUP_CONCAT(DISTINCT CONCAT(ps.size, ':', COALESCE(ps.extra_price, 0)) ORDER BY ps.size SEPARATOR ', ') sizes,
                       GROUP_CONCAT(DISTINCT i.ingredient_name ORDER BY i.ingredient_name SEPARATOR ', ') toppings
                FROM Product p
                LEFT JOIN Product_category pc ON pc.p_category_id = p.p_category_id
                LEFT JOIN Product_size ps ON ps.product_id = p.product_id AND (ps.status IS NULL OR LOWER(ps.status) = 'active')
                LEFT JOIN Product_topping pt ON pt.product_id = p.product_id
                LEFT JOIN Ingredient i ON i.ingredient_id = pt.ingredient_id AND (i.status IS NULL OR LOWER(i.status) = 'active')
                WHERE p.status IS NULL OR LOWER(p.status) IN ('active', 'available')
                GROUP BY p.product_id, p.product_name, p.description, p.base_price, p.product_type, pc.p_category_name
                ORDER BY p.product_name
                LIMIT ?
                """, MAX_PRODUCTS);
        database.put("products", publicProducts(productRows));
        database.put("seasonalProducts", publicProducts(queryRows("seasonalProducts", """
                SELECT p.product_id productId,
                       p.product_name productName,
                       p.description,
                       p.base_price basePrice,
                       p.product_type productType,
                       pc.p_category_name categoryName,
                       s.season_id seasonId,
                       s.season_name seasonName,
                       s.start_date seasonStartDate,
                       s.end_date seasonEndDate,
                       GROUP_CONCAT(DISTINCT CONCAT(ps.size, ':', COALESCE(ps.extra_price, 0)) ORDER BY ps.size SEPARATOR ', ') sizes,
                       GROUP_CONCAT(DISTINCT i.ingredient_name ORDER BY i.ingredient_name SEPARATOR ', ') toppings
                FROM Product p
                LEFT JOIN Seasonal_product sp ON sp.product_id = p.product_id
                LEFT JOIN Season s ON s.season_id = sp.season_id
                LEFT JOIN Product_category pc ON pc.p_category_id = p.p_category_id
                LEFT JOIN Product_size ps ON ps.product_id = p.product_id AND (ps.status IS NULL OR LOWER(ps.status) = 'active')
                LEFT JOIN Product_topping pt ON pt.product_id = p.product_id
                LEFT JOIN Ingredient i ON i.ingredient_id = pt.ingredient_id AND (i.status IS NULL OR LOWER(i.status) = 'active')
                WHERE (p.status IS NULL OR LOWER(p.status) IN ('active', 'available'))
                  AND (LOWER(COALESCE(p.product_type, '')) = 'seasonal' OR sp.product_id IS NOT NULL)
                  AND (s.season_id IS NULL OR (
                       (s.status IS NULL OR LOWER(s.status) = 'active')
                       AND s.start_date <= CURRENT_DATE()
                       AND s.end_date >= CURRENT_DATE()
                  ))
                GROUP BY p.product_id, p.product_name, p.description, p.base_price, p.product_type,
                         pc.p_category_name, s.season_id, s.season_name, s.start_date, s.end_date
                ORDER BY s.start_date DESC, p.product_name
                LIMIT ?
                """, MAX_REFERENCE_ROWS)));
        database.put("combos", publicCombos(queryRows("combos", """
                SELECT c.combo_id comboId,
                       c.combo_name comboName,
                       c.description,
                       c.category,
                       c.price,
                       c.start_date startDate,
                       c.end_date endDate,
                       c.status,
                       GROUP_CONCAT(DISTINCT CONCAT(COALESCE(p.product_name, CONCAT('Product #', cd.product_id)), ' x', COALESCE(cd.quantity, 1))
                                    ORDER BY p.product_name SEPARATOR ', ') items
                FROM Combo c
                LEFT JOIN Combo_detail cd ON cd.combo_id = c.combo_id
                LEFT JOIN Product p ON p.product_id = cd.product_id
                WHERE (c.status IS NULL OR LOWER(c.status) = 'active')
                  AND (c.start_date IS NULL OR c.start_date <= CURRENT_DATE())
                  AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE())
                GROUP BY c.combo_id, c.combo_name, c.description, c.category, c.price, c.start_date, c.end_date, c.status
                ORDER BY c.start_date DESC, c.combo_name
                LIMIT ?
                """, MAX_REFERENCE_ROWS)));
        database.put("membershipRanks", queryRows("membershipRanks", """
                SELECT rank_id rankId,
                       rank_name rankName,
                       rank_order rankOrder,
                       min_exp minExp,
                       min_total_money minTotalMoney,
                       min_total_orders minTotalOrders,
                       discount_percent discountPercent,
                       exp_multiplier expMultiplier,
                       drips_multiplier dripsMultiplier,
                       description,
                       status
                FROM Membership_rank
                WHERE status IS NULL OR LOWER(status) = 'active'
                ORDER BY rank_order ASC, min_exp ASC
                LIMIT ?
                """, MAX_REFERENCE_ROWS));
        database.put("promotions", queryRows("promotions", """
                SELECT coupon_id promotionId,
                       code,
                       description,
                       discount_type discountType,
                       discount_value discountValue,
                       max_discount maxDiscount,
                       min_order_value minOrderValue,
                       apply_for applyFor,
                       start_date startDate,
                       end_date endDate,
                       status
                FROM Coupon
                WHERE (status IS NULL OR LOWER(status) = 'active')
                  AND (start_date IS NULL OR start_date <= CURRENT_DATE())
                  AND (end_date IS NULL OR end_date >= CURRENT_DATE())
                  AND (usage_limit IS NULL OR used_count IS NULL OR used_count < usage_limit)
                ORDER BY end_date ASC, coupon_id DESC
                LIMIT ?
                """, MAX_REFERENCE_ROWS));
        database.put("faq", queryRows("faq", """
                SELECT news_id faqId, title question, summary answer, category
                FROM News
                WHERE (status IS NULL OR LOWER(status) IN ('active', 'published'))
                  AND (LOWER(category) LIKE '%faq%' OR LOWER(category) LIKE '%hoi%' OR LOWER(category) LIKE '%hỏi%')
                ORDER BY updated_at DESC, created_at DESC
                LIMIT ?
                """, MAX_REFERENCE_ROWS));
        database.put("policies", queryRows("policies", """
                SELECT news_id policyId, title, summary, category
                FROM News
                WHERE (status IS NULL OR LOWER(status) IN ('active', 'published'))
                  AND (LOWER(category) LIKE '%policy%' OR LOWER(category) LIKE '%chinh%' OR LOWER(category) LIKE '%chính%')
                ORDER BY updated_at DESC, created_at DESC
                LIMIT ?
                """, MAX_REFERENCE_ROWS));
        database.put("stores", queryRows("stores", """
                SELECT branch_id storeId,
                       branch_name storeName,
                       address,
                       address_detail addressDetail,
                       phone,
                       email,
                       map_url mapUrl,
                       status
                FROM Branch
                WHERE status IS NULL OR LOWER(status) IN ('active', 'open')
                ORDER BY branch_name
                LIMIT ?
                """, MAX_REFERENCE_ROWS));
        return database;
    }

    private List<Map<String, Object>> queryRows(String key, String sql, Object... args) {
        try {
            return jdbcTemplate.queryForList(sql, args);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String buildSystemPrompt(Map<String, Object> database) {
        return """
                Bạn là trợ lý ảo thân thiện của CoffeeGo, chuỗi cà phê hiện đại tại Việt Nam.
                Xưng "mình", gọi khách là "bạn". Tone trẻ trung, tự nhiên, dùng emoji vừa phải.

                NHÓM 1 - CÂU HỎI XÃ GIAO:
                Chào hỏi, cảm ơn, tạm biệt, hỏi bot là ai, khen ngợi, hỏi thăm thì trả lời trực tiếp, không cần tra cứu dữ liệu.

                NHÓM 2 - CÂU HỎI VỀ SẢN PHẨM / DỊCH VỤ:
                Với câu hỏi về món uống, giá, size, topping, khuyến mãi, voucher, cửa hàng, giờ mở cửa, chính sách đổi trả hoặc giao hàng:
                - Tra cứu trong <database> rồi trả lời.
                - Tìm thấy thì trả lời chính xác theo dữ liệu.
                - Không tìm thấy thì xin lỗi ngắn gọn và gợi ý 2-3 món tương tự từ <database>.

                NHÓM 3 - HOÀN TOÀN NGOÀI PHẠM VI:
                Nếu câu hỏi không liên quan đến cà phê hoặc CoffeeGo, từ chối nhẹ và kéo về menu/khuyến mãi CoffeeGo.

                QUY TẮC QUAN TRỌNG:
                - Không bịa tên món, giá, khuyến mãi, chính sách hoặc thông tin không có trong <database>.
                - Không gợi ý sản phẩm có tên vô nghĩa hoặc giá bất thường.
                - Gợi ý chỉ lấy từ danh sách sản phẩm thực trong <database>.
                - Nếu không có món tương tự thì chỉ xin lỗi và mời xem toàn bộ menu.
                - Độ ưu tiên tra cứu: products -> seasonalProducts -> combos -> membershipRanks -> promotions -> faq -> policies -> stores.

                %s
                """.formatted(toDatabaseXml(database));
    }

    private String toDatabaseXml(Map<String, Object> database) {
        return """
                <database>
                  <products>%s</products>
                  <seasonalProducts>%s</seasonalProducts>
                  <combos>%s</combos>
                  <membershipRanks>%s</membershipRanks>
                  <promotions>%s</promotions>
                  <faq>%s</faq>
                  <policies>%s</policies>
                  <stores>%s</stores>
                </database>
                """.formatted(
                toJson(database.get("products")),
                toJson(database.get("seasonalProducts")),
                toJson(database.get("combos")),
                toJson(database.get("membershipRanks")),
                toJson(database.get("promotions")),
                toJson(database.get("faq")),
                toJson(database.get("policies")),
                toJson(database.get("stores"))
        );
    }

    private String callProvider(String systemPrompt, String message, List<CustomerAssistantMessage> history) {
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
            payload.put("temperature", 0.25);
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

    private String fallbackAnswer(String message, Map<String, Object> database) {
        String normalized = normalizeText(message);
        List<Map<String, Object>> products = products(database);
        List<Map<String, Object>> seasonalProducts = rows(database, "seasonalProducts");
        List<Map<String, Object>> combos = rows(database, "combos");
        List<Map<String, Object>> membershipRanks = rows(database, "membershipRanks");
        List<Map<String, Object>> promotions = rows(database, "promotions");
        List<Map<String, Object>> faq = rows(database, "faq");
        List<Map<String, Object>> policies = rows(database, "policies");
        List<Map<String, Object>> stores = rows(database, "stores");

        if (isOutsideCoffeeScope(normalized)) {
            return outsideScopeAnswer();
        }

        Map<String, Object> product = findProduct(normalized, products);
        if (product != null) {
            return productAnswer(product);
        }

        Map<String, Object> combo = findCombo(normalized, combos);
        if (combo != null) {
            return comboAnswer(combo);
        }

        Map<String, Object> membershipRank = findMembershipRank(normalized, membershipRanks);
        if (membershipRank != null) {
            return membershipRankAnswer(membershipRank);
        }

        if (isSeasonalQuestion(normalized)) {
            return listSeasonalProducts(seasonalProducts, products);
        }

        if (isComboQuestion(normalized)) {
            return listCombos(combos, products);
        }

        if (isMembershipQuestion(normalized)) {
            return listMembershipRanks(membershipRanks, products);
        }

        if (containsAny(normalized, "voucher", "coupon", "khuyen mai", "uu dai", "ma giam", "giam gia")) {
            if (!promotions.isEmpty()) {
                return listPromotions(promotions);
            }
            return missingAnswer("khuyến mãi bạn hỏi", products);
        }

        if (containsAny(normalized, "faq", "hoi", "cau hoi", "thac mac")) {
            Map<String, Object> match = findTextRow(normalized, faq, "question", "answer", "title", "summary");
            return match == null ? missingAnswer("câu hỏi thường gặp này", products) : textRowAnswer(match, "question", "answer");
        }

        if (containsAny(normalized, "chinh sach", "doi tra", "hoan tien", "huy don", "bao hanh")) {
            Map<String, Object> match = findTextRow(normalized, policies, "title", "summary");
            return match == null ? missingAnswer("chính sách bạn hỏi", products) : textRowAnswer(match, "title", "summary");
        }

        if (containsAny(normalized, "cua hang", "chi nhanh", "dia chi", "store", "mo cua")) {
            if (!stores.isEmpty()) {
                return listStores(stores);
            }
            return missingAnswer("danh sách cửa hàng", products);
        }

        if (containsAny(normalized, "menu", "thuc don", "dat hang", "order", "mon nao", "do uong")) {
            return menuSuggestionAnswer(products);
        }

        return missingAnswer(message, products);
    }

    private String socialAnswer(String message) {
        String normalized = normalizeText(message);
        if (normalized.isBlank()) {
            return "";
        }
        if (containsAny(normalized, "cam on", "thanks", "thank you", "thank")) {
            return "Không có gì bạn ơi! Nếu cần thêm gì cứ hỏi mình nhé 😊";
        }
        if (containsAny(normalized, "tam biet", "hen gap lai", "bye", "goodbye")) {
            return "Tạm biệt bạn! Hẹn gặp lại tại CoffeeGo nhé ☕✨";
        }
        if (containsAny(normalized, "ban la ai", "may la gi", "bot hay nguoi", "la bot", "tro ly ao", "ban la gi")) {
            return "Mình là trợ lý ảo của CoffeeGo! Mình có thể giúp bạn tìm món uống, xem giá, hoặc hỏi về chương trình ưu đãi 😄";
        }
        if (containsAny(normalized, "gioi qua", "hay that", "tot qua", "de thuong", "xinh qua")) {
            return "Cảm ơn bạn đã khen! Mình luôn cố gắng hỗ trợ tốt nhất 😊";
        }
        if (containsAny(normalized, "ban khoe khong", "khoe khong", "hom nay the nao", "ban on khong")) {
            return "Mình khỏe lắm, cảm ơn bạn hỏi thăm!\nBạn đang muốn tìm món gì uống hôm nay không? ☕";
        }
        if (isGreeting(normalized)) {
            return "Chào bạn! Mình là trợ lý của CoffeeGo ☕\nMình có thể giúp bạn xem menu, tìm món, hoặc hỏi về khuyến mãi nhé!";
        }
        return "";
    }

    private String productAnswer(Map<String, Object> product) {
        String name = getString(product, "productName", "productname");
        String description = getString(product, "description");
        Long price = getLong(product, "basePrice", "baseprice");
        String sizes = getString(product, "sizes");
        String toppings = getString(product, "toppings");

        StringBuilder answer = new StringBuilder();
        answer.append(name).append(" tại CoffeeGo");
        if (price != null && price > 0) {
            answer.append(" giá ").append(formatVnd(price));
        } else {
            answer.append(" hiện chưa có giá cập nhật trong CSDL");
        }
        answer.append(".");
        if (!description.isBlank()) {
            answer.append("\n").append(description);
        }
        if (!sizes.isBlank()) {
            answer.append("\nSize hiện có: ").append(sizes).append(".");
        }
        if (!toppings.isBlank()) {
            answer.append("\nTopping gợi ý từ dữ liệu: ").append(toppings).append(".");
        }
        answer.append("\nBạn muốn thêm món này vào giỏ không? ☕");
        return answer.toString();
    }

    private String listPromotions(List<Map<String, Object>> promotions) {
        StringBuilder answer = new StringBuilder("Mình tìm thấy ưu đãi đang chạy nè 🎁");
        promotions.stream().limit(3).forEach(promotion -> {
            String code = getString(promotion, "code");
            String description = getString(promotion, "description");
            String discountType = getString(promotion, "discountType", "discounttype");
            Long discountValue = getLong(promotion, "discountValue", "discountvalue");
            answer.append("\n• ").append(code.isBlank() ? "Ưu đãi" : code);
            if (discountValue != null) {
                answer.append(" — ").append(discountText(discountType, discountValue));
            }
            if (!description.isBlank()) {
                answer.append(", ").append(description);
            }
        });
        answer.append("\nBạn muốn dùng mã nào cho đơn hiện tại không? ☕");
        return answer.toString();
    }

    private String listStores(List<Map<String, Object>> stores) {
        StringBuilder answer = new StringBuilder("Mình tìm thấy các cửa hàng CoffeeGo đang hoạt động:");
        stores.stream().limit(3).forEach(store -> {
            String name = getString(store, "storeName", "storename");
            String address = getString(store, "address");
            String phone = getString(store, "phone");
            answer.append("\n• ").append(name.isBlank() ? "CoffeeGo" : name);
            if (!address.isBlank()) answer.append(" — ").append(address);
            if (!phone.isBlank()) answer.append(" (").append(phone).append(")");
        });
        answer.append("\nBạn muốn xem chi nhánh nào gần bạn hơn không? ☕");
        return answer.toString();
    }

    private String listSeasonalProducts(List<Map<String, Object>> seasonalProducts, List<Map<String, Object>> products) {
        if (seasonalProducts.isEmpty()) {
            List<Map<String, Object>> suggestions = suggestProducts(products, "ca phe");
            StringBuilder answer = new StringBuilder("Xin lỗi bạn, hiện CoffeeGo chưa có sản phẩm mùa đang mở bán trong CSDL.");
            if (!suggestions.isEmpty()) {
                answer.append("\nBạn có thể xem vài món hiện có:");
                suggestions.forEach(product -> answer.append("\n- ").append(productLine(product)));
                answer.append("\nBạn muốn xem toàn bộ menu hiện có không? ☕");
            } else {
                answer.append("\nBạn muốn xem toàn bộ menu hiện có không? ☕");
            }
            return answer.toString();
        }
        StringBuilder answer = new StringBuilder("Mình tìm thấy các món mùa đang mở bán nè:");
        seasonalProducts.stream().limit(5).forEach(product -> {
            answer.append("\n- ").append(productLine(product));
            String seasonName = getString(product, "seasonName", "seasonname");
            if (!seasonName.isBlank()) {
                answer.append(" — mùa ").append(seasonName);
            }
        });
        answer.append("\nBạn muốn thử món mùa nào không? ☕");
        return answer.toString();
    }

    private String listCombos(List<Map<String, Object>> combos, List<Map<String, Object>> products) {
        if (combos.isEmpty()) {
            List<Map<String, Object>> suggestions = suggestProducts(products, "ca phe");
            StringBuilder answer = new StringBuilder("Xin lỗi bạn, hiện CoffeeGo chưa có combo đang mở bán trong CSDL.");
            if (!suggestions.isEmpty()) {
                answer.append("\nBạn có thể thử các món lẻ này trước:");
                suggestions.forEach(product -> answer.append("\n- ").append(productLine(product)));
                answer.append("\nBạn muốn xem toàn bộ menu hiện có không? ☕");
            } else {
                answer.append("\nBạn muốn xem toàn bộ menu hiện có không? ☕");
            }
            return answer.toString();
        }
        StringBuilder answer = new StringBuilder("CoffeeGo đang có các combo này nè:");
        combos.stream().limit(5).forEach(combo -> answer.append("\n- ").append(comboLine(combo)));
        answer.append("\nBạn muốn xem chi tiết combo nào không? ☕");
        return answer.toString();
    }

    private String comboAnswer(Map<String, Object> combo) {
        StringBuilder answer = new StringBuilder();
        answer.append(comboLine(combo));
        String items = getString(combo, "items");
        if (!items.isBlank()) {
            answer.append("\nCombo gồm: ").append(items).append(".");
        }
        answer.append("\nBạn muốn thêm combo này vào giỏ không? ☕");
        return answer.toString();
    }

    private String listMembershipRanks(List<Map<String, Object>> membershipRanks, List<Map<String, Object>> products) {
        if (membershipRanks.isEmpty()) {
            return missingAnswer("hạng thành viên", products);
        }
        StringBuilder answer = new StringBuilder("CoffeeGo đang có các hạng thành viên này nè:");
        membershipRanks.stream().limit(6).forEach(rank -> answer.append("\n- ").append(membershipRankLine(rank)));
        answer.append("\nBạn muốn xem kỹ quyền lợi hạng nào không? ☕");
        return answer.toString();
    }

    private String membershipRankAnswer(Map<String, Object> rank) {
        StringBuilder answer = new StringBuilder(membershipRankLine(rank));
        String description = getString(rank, "description");
        if (!description.isBlank()) {
            answer.append("\nQuyền lợi: ").append(description);
        }
        answer.append("\nBạn muốn mình xem thêm các hạng khác không? 😊");
        return answer.toString();
    }

    private String menuSuggestionAnswer(List<Map<String, Object>> products) {
        if (products.isEmpty()) {
            return "Xin lỗi bạn, hiện CoffeeGo chưa có dữ liệu menu trong CSDL.\nBạn muốn mình báo lại khi menu được cập nhật không? ☕";
        }
        StringBuilder answer = new StringBuilder("Menu hiện có vài món đáng thử nè:");
        products.stream().limit(5).forEach(product ->
                answer.append("\n• ").append(productLine(product))
        );
        answer.append("\nBạn muốn biết thêm món nào không? ☕");
        return answer.toString();
    }

    private String missingAnswer(String topic, List<Map<String, Object>> products) {
        List<Map<String, Object>> suggestions = suggestProducts(products, topic);
        StringBuilder answer = new StringBuilder();
        String cleanTopic = cleanTopic(topic);
        if (isLikelyProductTopic(normalizeText(topic))) {
            answer.append("Xin lỗi bạn, hiện CoffeeGo chưa có ").append(cleanTopic).append(" trong menu.");
        } else {
            answer.append("Xin lỗi bạn, hiện CoffeeGo chưa có thông tin về ").append(cleanTopic).append(".");
        }
        if (suggestions.isEmpty()) {
            answer.append("\nMình chưa thấy món tương tự trong CSDL. Bạn muốn xem toàn bộ menu hiện có không? ☕");
            return answer.toString();
        }
        answer.append("\nNhưng bạn có thể thử:");
        suggestions.forEach(product -> answer.append("\n- ").append(productLine(product)));
        answer.append("\nBạn muốn thử món nào không? ☕");
        return answer.toString();
    }

    private String outsideScopeAnswer() {
        return "Câu này hơi ngoài tầm của mình rồi 😄\n"
                + "Mình chỉ rành về cà phê thôi! Bạn muốn xem menu hay hỏi về khuyến mãi hôm nay không? ☕";
    }

    private String textRowAnswer(Map<String, Object> row, String titleKey, String bodyKey) {
        String title = getString(row, titleKey, "title", "question");
        String body = getString(row, bodyKey, "summary", "answer");
        if (body.isBlank()) {
            return title.isBlank()
                    ? "Mình chưa thấy nội dung chi tiết trong CSDL cho mục này."
                    : title;
        }
        return title.isBlank() ? body : title + "\n" + body;
    }

    private String comboLine(Map<String, Object> combo) {
        String name = getString(combo, "comboName", "comboname");
        String description = getString(combo, "description");
        Long price = getLong(combo, "price");
        StringBuilder line = new StringBuilder(name.isBlank() ? "Combo CoffeeGo" : name);
        if (price != null && price > 0) {
            line.append(" — ").append(formatVnd(price));
        }
        if (!description.isBlank()) {
            line.append(", ").append(shorten(description, 72));
        }
        return line.toString();
    }

    private String membershipRankLine(Map<String, Object> rank) {
        String name = getString(rank, "rankName", "rankname");
        String description = getString(rank, "description");
        Long minExp = getLong(rank, "minExp", "minexp");
        Long minTotalMoney = getLong(rank, "minTotalMoney", "mintotalmoney");
        Long minTotalOrders = getLong(rank, "minTotalOrders", "mintotalorders");
        Long discountPercent = getLong(rank, "discountPercent", "discountpercent");
        Double expMultiplier = getDouble(rank, "expMultiplier", "expmultiplier");
        Double dripsMultiplier = getDouble(rank, "dripsMultiplier", "dripsmultiplier");

        StringBuilder line = new StringBuilder(name.isBlank() ? "Hạng thành viên CoffeeGo" : name);
        List<String> requirements = new ArrayList<>();
        if (minExp != null && minExp > 0) requirements.add(minExp + " EXP");
        if (minTotalMoney != null && minTotalMoney > 0) requirements.add("chi tiêu " + formatVnd(minTotalMoney));
        if (minTotalOrders != null && minTotalOrders > 0) requirements.add(minTotalOrders + " đơn");
        line.append(requirements.isEmpty() ? " — hạng khởi đầu" : " — cần " + String.join(", ", requirements));

        List<String> benefits = new ArrayList<>();
        if (discountPercent != null && discountPercent > 0) benefits.add("giảm " + discountPercent + "%");
        if (expMultiplier != null && expMultiplier > 1) benefits.add("EXP x" + formatMultiplier(expMultiplier));
        if (dripsMultiplier != null && dripsMultiplier > 1) benefits.add("Drips x" + formatMultiplier(dripsMultiplier));
        if (!benefits.isEmpty()) {
            line.append("; ").append(String.join(", ", benefits));
        }
        if (!description.isBlank()) {
            line.append(", ").append(shorten(description, 80));
        }
        return line.toString();
    }

    private String productLine(Map<String, Object> product) {
        String name = getString(product, "productName", "productname");
        String description = getString(product, "description");
        Long price = getLong(product, "basePrice", "baseprice");
        StringBuilder line = new StringBuilder(name.isBlank() ? "Sản phẩm CoffeeGo" : name);
        if (price != null && price > 0) {
            line.append(" — ").append(formatVnd(price));
        }
        if (!description.isBlank()) {
            line.append(", ").append(shorten(description, 72));
        }
        return line.toString();
    }

    private Map<String, Object> findProduct(String normalizedQuestion, List<Map<String, Object>> products) {
        for (Map<String, Object> product : products) {
            String name = normalizeText(getString(product, "productName", "productname"));
            if (!name.isBlank() && normalizedQuestion.contains(name)) {
                return product;
            }
        }
        for (Map<String, Object> product : products) {
            String name = normalizeText(getString(product, "productName", "productname"));
            if (matchesByTokens(normalizedQuestion, name)) {
                return product;
            }
        }
        return null;
    }

    private Map<String, Object> findCombo(String normalizedQuestion, List<Map<String, Object>> combos) {
        for (Map<String, Object> combo : combos) {
            String name = normalizeText(getString(combo, "comboName", "comboname"));
            if (!name.isBlank() && normalizedQuestion.contains(name)) {
                return combo;
            }
        }
        for (Map<String, Object> combo : combos) {
            String name = normalizeText(getString(combo, "comboName", "comboname"));
            if (matchesByTokens(normalizedQuestion, name)) {
                return combo;
            }
        }
        return null;
    }

    private Map<String, Object> findMembershipRank(String normalizedQuestion, List<Map<String, Object>> membershipRanks) {
        if (!isMembershipQuestion(normalizedQuestion)) {
            return null;
        }
        for (Map<String, Object> rank : membershipRanks) {
            String name = normalizeText(getString(rank, "rankName", "rankname"));
            if (!name.isBlank() && normalizedQuestion.contains(name)) {
                return rank;
            }
        }
        for (Map<String, Object> rank : membershipRanks) {
            String name = normalizeText(getString(rank, "rankName", "rankname"));
            if (matchesByTokens(normalizedQuestion, name)) {
                return rank;
            }
        }
        return null;
    }

    private Map<String, Object> findTextRow(String normalizedQuestion, List<Map<String, Object>> rows, String... keys) {
        for (Map<String, Object> row : rows) {
            StringBuilder text = new StringBuilder();
            for (String key : keys) {
                text.append(' ').append(getString(row, key));
            }
            if (matchesByTokens(normalizedQuestion, normalizeText(text.toString()))) {
                return row;
            }
        }
        return null;
    }

    private boolean matchesByTokens(String question, String candidate) {
        if (candidate.isBlank()) return false;
        String[] tokens = candidate.split("\\s+");
        int useful = 0;
        int matched = 0;
        for (String token : tokens) {
            if (token.length() < 3) continue;
            useful++;
            if (question.contains(token)) matched++;
        }
        return useful > 0 && matched >= Math.min(2, useful);
    }

    private List<Map<String, Object>> suggestProducts(List<Map<String, Object>> products, String topic) {
        if (products.isEmpty()) return List.of();
        String normalized = normalizeText(topic);
        String target = suggestionTarget(normalized);
        List<Map<String, Object>> sameKind = products.stream()
                .filter(product -> normalizeText(getString(product, "categoryName", "categoryname") + " "
                        + getString(product, "productType", "producttype") + " "
                        + getString(product, "productName", "productname")).contains(target))
                .limit(3)
                .toList();
        if (sameKind.size() >= 2) {
            return sameKind;
        }
        return products.stream().limit(3).toList();
    }

    private List<Map<String, Object>> publicProducts(List<Map<String, Object>> products) {
        if (products.isEmpty()) return List.of();
        return products.stream()
                .filter(this::isPublicProduct)
                .toList();
    }

    private List<Map<String, Object>> publicCombos(List<Map<String, Object>> combos) {
        if (combos.isEmpty()) return List.of();
        return combos.stream()
                .filter(this::isPublicCombo)
                .toList();
    }

    private boolean isPublicProduct(Map<String, Object> product) {
        String name = getString(product, "productName", "productname");
        Long price = getLong(product, "basePrice", "baseprice");
        return hasMeaningfulProductName(name)
                && price != null
                && price >= MIN_PUBLIC_PRODUCT_PRICE
                && price <= MAX_PUBLIC_PRODUCT_PRICE;
    }

    private boolean isPublicCombo(Map<String, Object> combo) {
        String name = getString(combo, "comboName", "comboname");
        Long price = getLong(combo, "price");
        return hasMeaningfulProductName(name)
                && price != null
                && price >= MIN_PUBLIC_COMBO_PRICE
                && price <= MAX_PUBLIC_COMBO_PRICE;
    }

    private boolean hasMeaningfulProductName(String name) {
        String normalized = normalizeText(name);
        if (normalized.length() < 3) return false;
        String compact = normalized.replaceAll("[^a-z0-9]", "");
        long letters = compact.chars().filter(Character::isLetter).count();
        if (letters < 3) return false;
        return compact.matches(".*[aeiouy].*");
    }

    private List<String> suggestionLabels(List<Map<String, Object>> products, String topic) {
        List<String> labels = new ArrayList<>();
        suggestProducts(products, topic).forEach(product -> {
            String name = getString(product, "productName", "productname");
            if (!name.isBlank()) labels.add(name);
        });
        if (labels.isEmpty()) {
            labels.addAll(defaultSuggestionLabels());
        }
        return labels;
    }

    private List<String> defaultSuggestionLabels() {
        return List.of("Xem menu hôm nay", "Ưu đãi đang chạy", "Cửa hàng gần bạn");
    }

    private String suggestionTarget(String normalized) {
        if (containsAny(normalized, "tra", "tea", "matcha")) return "tra";
        if (containsAny(normalized, "sinh to", "smoothie", "da xay")) return "sinh";
        if (containsAny(normalized, "topping", "tran chau", "thach")) return "tra";
        return "ca phe";
    }

    private boolean isOutsideCoffeeScope(String normalized) {
        return containsAny(normalized, "thoi tiet", "bong da", "chung khoan", "bitcoin", "tin tuc the gioi",
                "code", "lap trinh", "toan hoc", "giai bai", "ai la tong thong");
    }

    private boolean isLikelyProductTopic(String normalized) {
        return containsAny(normalized, "mon", "do uong", "menu", "gia", "size", "topping", "ban",
                "ca phe", "coffee", "tra", "sua", "latte", "matcha", "da xay", "sinh to", "combo", "mua", "season");
    }

    private boolean isMembershipQuestion(String normalized) {
        return containsAny(normalized, "hang thanh vien", "bac thanh vien", "thanh vien", "membership",
                "rank", "bac rank", "diem tich luy", "tich diem", "drips", "exp", "nang hang",
                "len hang", "dieu kien hang", "dieu kien len hang", "quyen loi hang",
                "quyen loi thanh vien", "uu dai hang", "uu dai thanh vien", "hang gold",
                "hang platinum", "hang black", "bac gold", "bac platinum", "bac black");
    }

    private boolean isSeasonalQuestion(String normalized) {
        return containsAny(normalized, "san pham mua", "mon mua", "do uong mua", "mua he", "mua dong",
                "mua thu", "mua xuan", "seasonal", "season");
    }

    private boolean isComboQuestion(String normalized) {
        return containsAny(normalized, "combo", "set do uong", "goi do uong", "goi mon", "set mon");
    }

    private boolean isGreeting(String normalized) {
        return normalized.equals("hi")
                || normalized.equals("hello")
                || normalized.equals("alo")
                || normalized.equals("xin chao")
                || normalized.equals("chao")
                || normalized.equals("chao ban")
                || normalized.startsWith("xin chao ")
                || normalized.startsWith("chao ");
    }

    private boolean containsAny(String value, String... needles) {
        for (String needle : needles) {
            if (value.contains(needle)) return true;
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> products(Map<String, Object> database) {
        return rows(database, "products");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> rows(Map<String, Object> database, String key) {
        Object value = database.get(key);
        if (value instanceof List<?>) {
            return (List<Map<String, Object>>) value;
        }
        return List.of();
    }

    private String discountText(String discountType, long discountValue) {
        String normalized = normalizeText(discountType);
        if (normalized.contains("percent")) {
            return "giảm " + discountValue + "%";
        }
        return "giảm " + formatVnd(discountValue);
    }

    private String formatVnd(long value) {
        NumberFormat format = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));
        return format.format(value) + "đ";
    }

    private String formatMultiplier(double value) {
        if (value == Math.rint(value)) {
            return String.valueOf((long) value);
        }
        return String.format(Locale.US, "%.2f", value).replaceAll("0+$", "").replaceAll("\\.$", "");
    }

    private String cleanTopic(String value) {
        String topic = trimToEmpty(value).replaceAll("\\s+", " ");
        if (topic.length() > 80) {
            return "chủ đề bạn hỏi";
        }
        String normalized = normalizeText(topic)
                .replaceAll("\\b(coffeego|gobot|go bot|minh|toi|ban|cho|hoi|ve|co|khong|gia|bao|nhieu|"
                        + "mua|mon|do|uong|trong|menu|hien|tai|nay|nhe|nha|khong)\\b", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return normalized.isBlank() ? "thông tin này" : normalized;
    }

    private String shorten(String value, int maxLength) {
        if (value.length() <= maxLength) return value;
        return value.substring(0, Math.max(0, maxLength - 3)).trim() + "...";
    }

    private String getString(Map<String, Object> row, String... keys) {
        for (String key : keys) {
            Object value = row.get(key);
            if (value == null) value = row.get(key.toLowerCase(Locale.ROOT));
            if (value == null) value = row.get(key.toUpperCase(Locale.ROOT));
            if (value != null) return String.valueOf(value).trim();
        }
        return "";
    }

    private Long getLong(Map<String, Object> row, String... keys) {
        for (String key : keys) {
            Object value = row.get(key);
            if (value == null) value = row.get(key.toLowerCase(Locale.ROOT));
            if (value == null) value = row.get(key.toUpperCase(Locale.ROOT));
            if (value instanceof Number number) return number.longValue();
            if (value != null) {
                try {
                    return Long.parseLong(String.valueOf(value));
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private Double getDouble(Map<String, Object> row, String... keys) {
        for (String key : keys) {
            Object value = row.get(key);
            if (value == null) value = row.get(key.toLowerCase(Locale.ROOT));
            if (value == null) value = row.get(key.toUpperCase(Locale.ROOT));
            if (value instanceof Number number) return number.doubleValue();
            if (value != null) {
                try {
                    return Double.parseDouble(String.valueOf(value));
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private String normalizeText(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
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
            return "[]";
        }
    }

    public static class CustomerAssistantRequest {
        public String message;
        public List<CustomerAssistantMessage> history = new ArrayList<>();
    }

    public static class CustomerAssistantMessage {
        public String role;
        public String content;
    }

    public static class CustomerAssistantResponse {
        public String answer;
        public String provider;
        public LocalDateTime generatedAt;
        public Map<String, Object> database;
        public List<String> suggestions;
    }
}
