package com.coffee.productservice.controller;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.productservice.dto.request.ProductSizeRequest;
    import com.coffee.productservice.entity.ProductVariant;
    import com.coffee.productservice.entity.ProductVariantId;
    import com.coffee.productservice.entity.ProductSize;
    import com.coffee.productservice.entity.SeasonalProduct;
    import com.coffee.productservice.entity.SeasonalProductId;
    import com.coffee.productservice.mapper.ProductSizeMapper;
    import com.coffee.productservice.repository.ProductSizeRepository;
    import com.coffee.productservice.repository.ProductVariantRepository;
    import com.coffee.productservice.repository.RecipeRepository;
    import com.coffee.productservice.repository.SeasonalProductRepository;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.DeleteMapping;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/products")
    @PreAuthorize("hasRole('admin')")
    public class ProductRelationsController {
        private final ProductVariantRepository productVariantRepository;
        private final SeasonalProductRepository seasonalProductRepository;
        private final RecipeRepository recipeRepository;
        private final ProductSizeRepository productSizeRepository;
        private final ProductSizeMapper productSizeMapper;

        public ProductRelationsController(ProductVariantRepository productVariantRepository,
                                          SeasonalProductRepository seasonalProductRepository,
                                          RecipeRepository recipeRepository,
                                          ProductSizeRepository productSizeRepository,
                                          ProductSizeMapper productSizeMapper) {
            this.productVariantRepository = productVariantRepository;
            this.seasonalProductRepository = seasonalProductRepository;
            this.recipeRepository = recipeRepository;
            this.productSizeRepository = productSizeRepository;
            this.productSizeMapper = productSizeMapper;
        }

        @GetMapping("/{productId}/sizes")
        public ApiResponse<?> sizes(@PathVariable Long productId) {
            return ApiResponse.success(productSizeRepository.findAll().stream()
                    .filter(item -> productId.equals(item.getProductId()))
                    .map(productSizeMapper::toResponse)
                    .toList());
        }

        @PostMapping("/{productId}/sizes")
        public ApiResponse<?> addSize(@PathVariable Long productId, @RequestBody ProductSizeRequest request) {
            request.setProductId(productId);
            ProductSize size = productSizeMapper.toEntity(request);
            return ApiResponse.success("Created", productSizeMapper.toResponse(productSizeRepository.save(size)));
        }

        @PostMapping("/{productId}/variants/{variantId}")
        public ApiResponse<Void> addVariant(@PathVariable Long productId, @PathVariable Long variantId) {
            ProductVariant item = new ProductVariant();
            item.setProductId(productId);
            item.setVariantId(variantId);
            item.setIsDefault(false);
            productVariantRepository.save(item);
            return ApiResponse.success("Variant assigned", null);
        }

        @DeleteMapping("/{productId}/variants/{variantId}")
        public ApiResponse<Void> removeVariant(@PathVariable Long productId, @PathVariable Long variantId) {
            ProductVariantId id = new ProductVariantId();
            id.setProductId(productId);
            id.setVariantId(variantId);
            productVariantRepository.deleteById(id);
            return ApiResponse.success("Variant removed", null);
        }

        @PostMapping("/seasons/{seasonId}/products/{productId}")
        public ApiResponse<Void> addSeasonalProduct(@PathVariable Long seasonId, @PathVariable Long productId) {
            SeasonalProduct item = new SeasonalProduct();
            item.setSeasonId(seasonId);
            item.setProductId(productId);
            seasonalProductRepository.save(item);
            return ApiResponse.success("Seasonal product assigned", null);
        }

        @DeleteMapping("/seasons/{seasonId}/products/{productId}")
        public ApiResponse<Void> removeSeasonalProduct(@PathVariable Long seasonId, @PathVariable Long productId) {
            SeasonalProductId id = new SeasonalProductId();
            id.setSeasonId(seasonId);
            id.setProductId(productId);
            seasonalProductRepository.deleteById(id);
            return ApiResponse.success("Seasonal product removed", null);
        }

        @GetMapping("/{productId}/recipes")
        public ApiResponse<?> recipesByProduct(@PathVariable Long productId) {
            return ApiResponse.success(recipeRepository.findAll().stream()
                    .filter(item -> productId.equals(item.getProductId()))
                    .toList());
        }
    }
