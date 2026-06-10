package com.coffee.productservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.productservice.dto.request.ProductSizeRequest;
import com.coffee.productservice.dto.response.ProductToppingResponse;
import com.coffee.productservice.entity.ProductSize;
import com.coffee.productservice.entity.ProductTopping;
import com.coffee.productservice.entity.ProductToppingId;
import com.coffee.productservice.entity.ProductVariant;
import com.coffee.productservice.entity.ProductVariantId;
import com.coffee.productservice.entity.SeasonalProduct;
import com.coffee.productservice.entity.SeasonalProductId;
import com.coffee.productservice.mapper.ProductSizeMapper;
import com.coffee.productservice.mapper.ProductVariantMapper;
import com.coffee.productservice.mapper.SeasonalProductMapper;
import com.coffee.productservice.repository.ProductSizeRepository;
import com.coffee.productservice.repository.ProductToppingRepository;
import com.coffee.productservice.repository.ProductVariantRepository;
import com.coffee.productservice.repository.SeasonalProductRepository;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductPublicRelationsController {
    private final ProductVariantRepository productVariantRepository;
    private final ProductVariantMapper productVariantMapper;
    private final SeasonalProductRepository seasonalProductRepository;
    private final SeasonalProductMapper seasonalProductMapper;
    private final ProductSizeRepository productSizeRepository;
    private final ProductSizeMapper productSizeMapper;
    private final ProductToppingRepository productToppingRepository;

    public ProductPublicRelationsController(ProductVariantRepository productVariantRepository,
                                            ProductVariantMapper productVariantMapper,
                                            SeasonalProductRepository seasonalProductRepository,
                                            SeasonalProductMapper seasonalProductMapper,
                                            ProductSizeRepository productSizeRepository,
                                            ProductSizeMapper productSizeMapper,
                                            ProductToppingRepository productToppingRepository) {
        this.productVariantRepository = productVariantRepository;
        this.productVariantMapper = productVariantMapper;
        this.seasonalProductRepository = seasonalProductRepository;
        this.seasonalProductMapper = seasonalProductMapper;
        this.productSizeRepository = productSizeRepository;
        this.productSizeMapper = productSizeMapper;
        this.productToppingRepository = productToppingRepository;
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

    @DeleteMapping("/{productId}/sizes/{sizeId}")
    public ApiResponse<Void> deleteSize(@PathVariable Long productId, @PathVariable Long sizeId) {
        productSizeRepository.findById(sizeId)
                .filter(item -> productId.equals(item.getProductId()))
                .ifPresent(productSizeRepository::delete);
        return ApiResponse.success("Deleted", null);
    }

    @GetMapping("/{productId}/variants")
    public ApiResponse<?> productVariants(@PathVariable Long productId) {
        return ApiResponse.success(productVariantRepository.findAll().stream()
                .filter(item -> productId.equals(item.getProductId()))
                .map(productVariantMapper::toResponse)
                .toList());
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

    @GetMapping("/{productId}/toppings")
    public ApiResponse<?> productToppings(@PathVariable Long productId) {
        return ApiResponse.success(productToppingRepository.findAll().stream()
                .filter(item -> productId.equals(item.getProductId()))
                .map(this::toProductToppingResponse)
                .toList());
    }

    @PostMapping("/{productId}/toppings/{ingredientId}")
    public ApiResponse<Void> addTopping(@PathVariable Long productId, @PathVariable Long ingredientId) {
        ProductTopping item = new ProductTopping();
        item.setProductId(productId);
        item.setIngredientId(ingredientId);
        productToppingRepository.save(item);
        return ApiResponse.success("Topping assigned", null);
    }

    @DeleteMapping("/{productId}/toppings/{ingredientId}")
    public ApiResponse<Void> removeTopping(@PathVariable Long productId, @PathVariable Long ingredientId) {
        ProductToppingId id = new ProductToppingId();
        id.setProductId(productId);
        id.setIngredientId(ingredientId);
        productToppingRepository.deleteById(id);
        return ApiResponse.success("Topping removed", null);
    }

    @GetMapping("/seasonal-products")
    public ApiResponse<?> seasonalProducts() {
        return ApiResponse.success(seasonalProductRepository.findAll().stream()
                .map(seasonalProductMapper::toResponse)
                .toList());
    }

    @GetMapping("/{productId}/seasons")
    public ApiResponse<?> seasonsByProduct(@PathVariable Long productId) {
        return ApiResponse.success(seasonalProductRepository.findAll().stream()
                .filter(item -> productId.equals(item.getProductId()))
                .map(seasonalProductMapper::toResponse)
                .toList());
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

    private ProductToppingResponse toProductToppingResponse(ProductTopping entity) {
        ProductToppingResponse response = new ProductToppingResponse();
        response.setProductId(entity.getProductId());
        response.setIngredientId(entity.getIngredientId());
        return response;
    }
}
