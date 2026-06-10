package com.coffee.productservice.repository;

import com.coffee.productservice.entity.ProductVariant;
import com.coffee.productservice.entity.ProductVariantId;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, ProductVariantId>, JpaSpecificationExecutor<ProductVariant> {
    List<ProductVariant> findByProductIdIn(List<Long> productIds);
}
