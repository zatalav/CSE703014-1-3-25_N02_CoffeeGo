package com.coffee.productservice.config;

import com.coffee.productservice.entity.Combo;
import com.coffee.productservice.entity.ComboDetail;
import com.coffee.productservice.entity.ComboDetailId;
import com.coffee.productservice.entity.Product;
import com.coffee.productservice.entity.ProductCategory;
import com.coffee.productservice.entity.ProductSize;
import com.coffee.productservice.entity.Season;
import com.coffee.productservice.entity.SeasonalProduct;
import com.coffee.productservice.entity.SeasonalProductId;
import com.coffee.productservice.repository.ComboDetailRepository;
import com.coffee.productservice.repository.ComboRepository;
import com.coffee.productservice.repository.ProductCategoryRepository;
import com.coffee.productservice.repository.ProductRepository;
import com.coffee.productservice.repository.ProductSizeRepository;
import com.coffee.productservice.repository.SeasonRepository;
import com.coffee.productservice.repository.SeasonalProductRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CustomerMenuDataSeeder implements ApplicationRunner {
    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductSizeRepository productSizeRepository;
    private final SeasonRepository seasonRepository;
    private final SeasonalProductRepository seasonalProductRepository;
    private final ComboRepository comboRepository;
    private final ComboDetailRepository comboDetailRepository;

    public CustomerMenuDataSeeder(ProductCategoryRepository categoryRepository,
                                  ProductRepository productRepository,
                                  ProductSizeRepository productSizeRepository,
                                  SeasonRepository seasonRepository,
                                  SeasonalProductRepository seasonalProductRepository,
                                  ComboRepository comboRepository,
                                  ComboDetailRepository comboDetailRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.productSizeRepository = productSizeRepository;
        this.seasonRepository = seasonRepository;
        this.seasonalProductRepository = seasonalProductRepository;
        this.comboRepository = comboRepository;
        this.comboDetailRepository = comboDetailRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ProductCategory fruitTea = ensureCategory("Tra trai cay");
        ProductCategory coffee = ensureCategory("Ca phe hien dai");

        Product lycheeTea = ensureProduct("Tra vai mua he", fruitTea.getPCategoryId(), 45000L,
                "Tra vai thanh mat, huong trai cay nhe, hop ngay nang.", "seasonal");
        Product coldBrew = ensureProduct("Cold Brew Cam Sa", coffee.getPCategoryId(), 49000L,
                "Ca phe u lanh voi cam sa tuoi, vi sang va de uong.", "seasonal");

        ensureSize(lycheeTea.getProductId(), "M", 0L);
        ensureSize(lycheeTea.getProductId(), "L", 7000L);
        ensureSize(coldBrew.getProductId(), "M", 0L);
        ensureSize(coldBrew.getProductId(), "L", 8000L);

        Season summer = ensureCurrentSeason("Mua he CoffeeGo");
        ensureSeasonalProduct(summer.getSeasonId(), lycheeTea.getProductId());
        ensureSeasonalProduct(summer.getSeasonId(), coldBrew.getProductId());

        Combo summerCombo = ensureCombo("Combo Mua He Thanh Mat", 79000L,
                "Tra vai mua he ket hop Cold Brew Cam Sa, tiet kiem hon khi mua le.");
        ensureComboDetail(summerCombo.getComboId(), lycheeTea.getProductId(), 1);
        ensureComboDetail(summerCombo.getComboId(), coldBrew.getProductId(), 1);
    }

    private ProductCategory ensureCategory(String name) {
        return categoryRepository.findAll().stream()
                .filter(category -> name.equalsIgnoreCase(category.getPCategoryName()))
                .findFirst()
                .orElseGet(() -> {
                    ProductCategory category = new ProductCategory();
                    category.setPCategoryName(name);
                    return categoryRepository.save(category);
                });
    }

    private Product ensureProduct(String name, Long categoryId, Long price, String description, String productType) {
        Product product = productRepository.findByProductName(name).orElseGet(Product::new);
        product.setPCategoryId(categoryId);
        product.setProductName(name);
        product.setDescription(description);
        product.setBasePrice(price);
        product.setProductType(productType);
        product.setStatus("active");
        if (product.getCreatedAt() == null) {
            product.setCreatedAt(LocalDateTime.now());
        }
        return productRepository.save(product);
    }

    private void ensureSize(Long productId, String sizeName, Long extraPrice) {
        boolean exists = productSizeRepository.findAll().stream()
                .anyMatch(size -> productId.equals(size.getProductId()) && sizeName.equalsIgnoreCase(size.getSize()));
        if (exists) {
            return;
        }
        ProductSize size = new ProductSize();
        size.setProductId(productId);
        size.setSize(sizeName);
        size.setExtraPrice(extraPrice);
        size.setStatus("active");
        productSizeRepository.save(size);
    }

    private Season ensureCurrentSeason(String name) {
        LocalDate now = LocalDate.now();
        Season season = seasonRepository.findAll().stream()
                .filter(item -> name.equalsIgnoreCase(item.getSeasonName()))
                .findFirst()
                .orElseGet(Season::new);
        season.setSeasonName(name);
        season.setStartDate(now.minusDays(30));
        season.setEndDate(now.plusDays(120));
        season.setStatus("active");
        return seasonRepository.save(season);
    }

    private void ensureSeasonalProduct(Long seasonId, Long productId) {
        SeasonalProductId id = new SeasonalProductId();
        id.setSeasonId(seasonId);
        id.setProductId(productId);
        if (seasonalProductRepository.existsById(id)) {
            return;
        }
        SeasonalProduct item = new SeasonalProduct();
        item.setSeasonId(seasonId);
        item.setProductId(productId);
        seasonalProductRepository.save(item);
    }

    private Combo ensureCombo(String name, Long price, String description) {
        LocalDate now = LocalDate.now();
        Combo combo = comboRepository.findAll().stream()
                .filter(item -> name.equalsIgnoreCase(item.getComboName()))
                .findFirst()
                .orElseGet(Combo::new);
        combo.setComboName(name);
        combo.setCategory("combo");
        combo.setDescription(description);
        combo.setPrice(price);
        combo.setStartDate(now.minusDays(30));
        combo.setEndDate(now.plusDays(120));
        combo.setStatus("active");
        return comboRepository.save(combo);
    }

    private void ensureComboDetail(Long comboId, Long productId, Integer quantity) {
        ComboDetailId id = new ComboDetailId();
        id.setComboId(comboId);
        id.setProductId(productId);
        ComboDetail detail = comboDetailRepository.findById(id).orElseGet(ComboDetail::new);
        detail.setComboId(comboId);
        detail.setProductId(productId);
        detail.setQuantity(quantity);
        comboDetailRepository.save(detail);
    }
}
