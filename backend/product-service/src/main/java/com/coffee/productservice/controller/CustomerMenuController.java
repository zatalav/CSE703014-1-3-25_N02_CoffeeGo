package com.coffee.productservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.productservice.entity.Combo;
import com.coffee.productservice.entity.Ingredient;
import com.coffee.productservice.entity.Product;
import com.coffee.productservice.entity.ProductCategory;
import com.coffee.productservice.entity.ProductSize;
import com.coffee.productservice.entity.ProductTopping;
import com.coffee.productservice.entity.ProductVariant;
import com.coffee.productservice.entity.Variant;
import com.coffee.productservice.repository.ComboRepository;
import com.coffee.productservice.repository.IngredientRepository;
import com.coffee.productservice.repository.ProductCategoryRepository;
import com.coffee.productservice.repository.ProductRepository;
import com.coffee.productservice.repository.ProductSizeRepository;
import com.coffee.productservice.repository.ProductToppingRepository;
import com.coffee.productservice.repository.ProductVariantRepository;
import com.coffee.productservice.repository.VariantRepository;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class CustomerMenuController {
    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductSizeRepository productSizeRepository;
    private final ProductVariantRepository productVariantRepository;
    private final VariantRepository variantRepository;
    private final IngredientRepository ingredientRepository;
    private final ProductToppingRepository productToppingRepository;
    private final ComboRepository comboRepository;
    private final JdbcTemplate jdbcTemplate;

    public CustomerMenuController(ProductRepository productRepository,
                                  ProductCategoryRepository categoryRepository,
                                  ProductSizeRepository productSizeRepository,
                                  ProductVariantRepository productVariantRepository,
                                  VariantRepository variantRepository,
                                  IngredientRepository ingredientRepository,
                                  ProductToppingRepository productToppingRepository,
                                  ComboRepository comboRepository,
                                  JdbcTemplate jdbcTemplate) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productSizeRepository = productSizeRepository;
        this.productVariantRepository = productVariantRepository;
        this.variantRepository = variantRepository;
        this.ingredientRepository = ingredientRepository;
        this.productToppingRepository = productToppingRepository;
        this.comboRepository = comboRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/customer-menu")
    public ApiResponse<CustomerMenuResponse> customerMenu() {
        List<Product> products = productRepository.findAll().stream()
                .filter(product -> product.getProductId() != null && isActive(product.getStatus()))
                .sorted(Comparator.comparing(Product::getProductId))
                .toList();
        List<Long> productIds = products.stream().map(Product::getProductId).toList();
        Set<Long> productIdSet = Set.copyOf(productIds);

        Map<Long, ProductCategory> categoryById = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(ProductCategory::getPCategoryId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
        Map<Long, List<ProductSize>> sizesByProductId = productSizeRepository.findByProductIdIn(productIds).stream()
                .filter(size -> productIdSet.contains(size.getProductId()) && isActive(size.getStatus()))
                .collect(Collectors.groupingBy(ProductSize::getProductId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, Variant> variantById = variantRepository.findAll().stream()
                .filter(variant -> isActive(variant.getStatus()))
                .collect(Collectors.toMap(Variant::getVariantId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
        Map<Long, List<ProductVariant>> variantsByProductId = productVariantRepository.findByProductIdIn(productIds).stream()
                .filter(item -> productIdSet.contains(item.getProductId()))
                .collect(Collectors.groupingBy(ProductVariant::getProductId, LinkedHashMap::new, Collectors.toList()));

        Set<Long> toppingCategoryIds = toppingCategoryIds();
        List<Ingredient> activeIngredients = ingredientRepository.findAll().stream()
                .filter(ingredient -> toppingCategoryIds.contains(ingredient.getICategoryId()))
                .filter(ingredient -> isActive(ingredient.getStatus()))
                .sorted(Comparator.comparing(Ingredient::getIngredientId))
                .toList();
        List<CustomerToppingResponse> allToppings = activeIngredients.stream()
                .map(this::toTopping)
                .toList();
        Map<Long, Ingredient> toppingById = activeIngredients.stream()
                .collect(Collectors.toMap(Ingredient::getIngredientId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
        Map<Long, List<ProductTopping>> toppingsByProductId = productToppingRepository.findByProductIdIn(productIds).stream()
                .filter(item -> productIdSet.contains(item.getProductId()))
                .collect(Collectors.groupingBy(ProductTopping::getProductId, LinkedHashMap::new, Collectors.toList()));

        List<CustomerProductResponse> productResponses = products.stream()
                .map(product -> toProductResponse(product, sizesByProductId, variantsByProductId, variantById,
                        toppingsByProductId, toppingById, categoryById))
                .collect(Collectors.toCollection(ArrayList::new));

        List<CustomerProductResponse> comboResponses = comboRepository.findAll().stream()
                .filter(combo -> combo.getComboId() != null && isCurrentCombo(combo))
                .sorted(Comparator.comparing(Combo::getComboId).reversed())
                .map(this::toComboResponse)
                .toList();
        productResponses.addAll(comboResponses);

        Set<String> usedCategoryIds = productResponses.stream()
                .map(CustomerProductResponse::category)
                .collect(Collectors.toSet());
        List<CustomerCategoryResponse> categories = categoryById.values().stream()
                .map(category -> new CustomerCategoryResponse(
                        categoryKey(category.getPCategoryId()),
                        valueOrDefault(category.getPCategoryName(), "Danh mục #" + category.getPCategoryId()),
                        categoryIcon(category.getPCategoryName()),
                        category.getPCategoryId()))
                .filter(category -> usedCategoryIds.contains(category.id()))
                .collect(Collectors.toCollection(ArrayList::new));

        Set<String> existingCategoryIds = categories.stream()
                .map(CustomerCategoryResponse::id)
                .collect(Collectors.toSet());
        if (!comboResponses.isEmpty() && existingCategoryIds.add("combo")) {
            categories.add(new CustomerCategoryResponse("combo", "Combo", "combo", null));
        }
        for (CustomerProductResponse product : productResponses) {
            if (existingCategoryIds.contains(product.category())) {
                continue;
            }
            Long categoryId = product.categoryId();
            CustomerCategoryResponse fallback = new CustomerCategoryResponse(
                    product.category(),
                    categoryId == null ? "Khác" : "Danh mục #" + categoryId,
                    "menu",
                    categoryId);
            categories.add(fallback);
            existingCategoryIds.add(fallback.id());
        }

        return ApiResponse.success(new CustomerMenuResponse(productResponses, categories, allToppings));
    }

    private CustomerProductResponse toProductResponse(Product product,
                                                      Map<Long, List<ProductSize>> sizesByProductId,
                                                      Map<Long, List<ProductVariant>> variantsByProductId,
                                                      Map<Long, Variant> variantById,
                                                      Map<Long, List<ProductTopping>> toppingsByProductId,
                                                      Map<Long, Ingredient> toppingById,
                                                      Map<Long, ProductCategory> categoryById) {
        Long productId = product.getProductId();
        Long basePrice = valueOrZero(product.getBasePrice());
        ProductCategory category = categoryById.get(product.getPCategoryId());
        boolean cake = isCakeProduct(product, category);
        List<CustomerPriceResponse> prices = sizesByProductId.getOrDefault(productId, List.of()).stream()
                .map(size -> new CustomerPriceResponse(
                        valueOrDefault(size.getSize(), "Tiêu chuẩn"),
                        basePrice + valueOrZero(size.getExtraPrice()),
                        size.getSizeId()))
                .sorted(this::comparePrice)
                .toList();
        if (prices.isEmpty()) {
            prices = List.of(new CustomerPriceResponse("Tiêu chuẩn", basePrice, null));
        }

        if (cake) {
            prices = List.of(new CustomerPriceResponse("Tieu chuan", basePrice, null));
        }

        List<String> variants = variantsByProductId.getOrDefault(productId, List.of()).stream()
                .map(relation -> variantById.get(relation.getVariantId()))
                .filter(variant -> variant != null && isActive(variant.getStatus()))
                .map(variant -> valueOrDefault(variant.getVariantLabel(), "Variant #" + variant.getVariantId()))
                .filter(value -> !value.isBlank())
                .toList();

        List<CustomerToppingResponse> toppings = toppingsByProductId.getOrDefault(productId, List.of()).stream()
                .map(relation -> toppingById.get(relation.getIngredientId()))
                .filter(ingredient -> ingredient != null && isActive(ingredient.getStatus()))
                .map(this::toTopping)
                .toList();

        if (cake) {
            variants = List.of();
            toppings = List.of();
        }

        return new CustomerProductResponse(
                String.valueOf(productId),
                productId,
                null,
                valueOrDefault(product.getProductName(), "Sản phẩm #" + productId),
                valueOrDefault(product.getDescription(), ""),
                prices,
                valueOrDefault(product.getImgUrl(), ""),
                categoryKey(product.getPCategoryId()),
                product.getPCategoryId(),
                "product",
                cake ? "cake" : valueOrDefault(product.getProductType(), "drink"),
                null,
                null,
                badgesFor(product),
                variants.isEmpty() ? null : variants,
                toppings);
    }

    private boolean isCakeProduct(Product product, ProductCategory category) {
        String type = normalize(product.getProductType());
        if ("cake".equals(type) || "bakery".equals(type) || "pastry".equals(type) || "snack".equals(type) || "food".equals(type)) {
            return true;
        }
        String text = normalize(String.join(" ",
                valueOrDefault(product.getProductName(), ""),
                valueOrDefault(product.getDescription(), ""),
                category == null ? "" : valueOrDefault(category.getPCategoryName(), "")));
        return text.contains("banh")
                || text.contains("cake")
                || text.contains("bakery")
                || text.contains("pastry")
                || text.contains("croissant")
                || text.contains("snack")
                || text.contains("food");
    }

    private CustomerProductResponse toComboResponse(Combo combo) {
        return new CustomerProductResponse(
                "combo-" + combo.getComboId(),
                -combo.getComboId(),
                combo.getComboId(),
                valueOrDefault(combo.getComboName(), "Combo #" + combo.getComboId()),
                valueOrDefault(combo.getDescription(), "Combo ưu đãi được CoffeeGo chuẩn bị sẵn cho nhóm khách đi cùng nhau."),
                List.of(new CustomerPriceResponse("Combo", valueOrZero(combo.getPrice()), null)),
                valueOrDefault(combo.getImgUrl(), "/customer-assets/summer-combo-banner.png"),
                "combo",
                null,
                "combo",
                "combo",
                combo.getStartDate() == null ? null : combo.getStartDate().toString(),
                combo.getEndDate() == null ? null : combo.getEndDate().toString(),
                badgesForCombo(combo),
                null,
                List.of());
    }

    private List<String> badgesFor(Product product) {
        String type = normalize(product.getProductType());
        String text = normalize(String.join(" ",
                valueOrDefault(product.getProductType(), ""),
                valueOrDefault(product.getProductName(), ""),
                valueOrDefault(product.getDescription(), "")));
        List<String> badges = new ArrayList<>();
        if ("seasonal".equals(type) || text.contains("mua vu") || text.contains("mua he")) {
            badges.add("Mùa vụ");
        }
        if (text.contains("best") || text.contains("ban chay") || text.contains("bestseller")) {
            badges.add("Bán chạy");
        }
        if (text.contains("hot")) {
            badges.add("HOT");
        }
        return badges.isEmpty() ? null : badges;
    }

    private List<String> badgesForCombo(Combo combo) {
        String text = normalize(String.join(" ",
                valueOrDefault(combo.getCategory(), ""),
                valueOrDefault(combo.getComboName(), ""),
                valueOrDefault(combo.getDescription(), "")));
        List<String> badges = new ArrayList<>();
        if (text.contains("hot") || text.contains("ban chay") || text.contains("bestseller")) {
            badges.add("HOT");
        }
        badges.add("Combo");
        return badges;
    }

    private CustomerToppingResponse toTopping(Ingredient ingredient) {
        return new CustomerToppingResponse(
                ingredient.getIngredientId(),
                valueOrDefault(ingredient.getIngredientName(), "Topping #" + ingredient.getIngredientId()),
                valueOrZero(ingredient.getToppingPrice()));
    }

    private Set<Long> toppingCategoryIds() {
        return Set.copyOf(jdbcTemplate.queryForList(
                """
                SELECT i_category_id
                FROM Ingredient_category
                WHERE LOWER(i_category_name) = 'topping'
                """,
                Long.class
        ));
    }

    private int comparePrice(CustomerPriceResponse left, CustomerPriceResponse right) {
        Map<String, Integer> order = Map.of("s", 1, "m", 2, "l", 3);
        int leftOrder = order.getOrDefault(normalize(left.size()), 99);
        int rightOrder = order.getOrDefault(normalize(right.size()), 99);
        if (leftOrder != rightOrder) {
            return Integer.compare(leftOrder, rightOrder);
        }
        return Long.compare(left.price(), right.price());
    }

    private boolean isCurrentCombo(Combo combo) {
        if (!isActive(combo.getStatus())) {
            return false;
        }
        LocalDate today = LocalDate.now();
        if (combo.getStartDate() != null && combo.getStartDate().isAfter(today)) {
            return false;
        }
        return combo.getEndDate() == null || !combo.getEndDate().isBefore(today);
    }

    private boolean isActive(String status) {
        String normalized = normalize(status);
        return normalized.isBlank() || "active".equals(normalized);
    }

    private String categoryKey(Long categoryId) {
        return categoryId == null ? "category-other" : "category-" + categoryId;
    }

    private String categoryIcon(String label) {
        String normalized = normalize(label);
        if (normalized.contains("ca phe") || normalized.contains("coffee")) return "coffee";
        if (normalized.contains("tra") || normalized.contains("matcha")) return "tea";
        if (normalized.contains("banh") || normalized.contains("snack")) return "snack";
        if (normalized.contains("combo")) return "combo";
        if (normalized.contains("sinh to") || normalized.contains("nuoc") || normalized.contains("do uong")) return "drink";
        return "menu";
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private String valueOrDefault(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private Long valueOrZero(Long value) {
        return value == null ? 0L : value;
    }

    public record CustomerMenuResponse(
            List<CustomerProductResponse> products,
            List<CustomerCategoryResponse> categories,
            List<CustomerToppingResponse> toppings) {
    }

    public record CustomerProductResponse(
            String id,
            Long productId,
            Long comboId,
            String name,
            String description,
            List<CustomerPriceResponse> prices,
            String image,
            String category,
            Long categoryId,
            String kind,
            String productType,
            String startDate,
            String endDate,
            List<String> badges,
            List<String> variants,
            List<CustomerToppingResponse> toppings) {
    }

    public record CustomerPriceResponse(String size, Long price, Long sizeId) {
    }

    public record CustomerToppingResponse(Long id, String name, Long price) {
    }

    public record CustomerCategoryResponse(String id, String label, String icon, Long categoryId) {
    }
}
