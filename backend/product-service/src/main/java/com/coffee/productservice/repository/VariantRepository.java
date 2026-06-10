package com.coffee.productservice.repository;

import com.coffee.productservice.entity.Variant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface VariantRepository extends JpaRepository<Variant, Long>, JpaSpecificationExecutor<Variant> {
    Optional<Variant> findByVariantGroupIgnoreCaseAndVariantLabelIgnoreCase(String variantGroup, String variantLabel);
}
