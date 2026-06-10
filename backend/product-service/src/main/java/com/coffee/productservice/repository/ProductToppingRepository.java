package com.coffee.productservice.repository;

import com.coffee.productservice.entity.ProductTopping;
import com.coffee.productservice.entity.ProductToppingId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductToppingRepository extends JpaRepository<ProductTopping, ProductToppingId>, JpaSpecificationExecutor<ProductTopping> {
    List<ProductTopping> findByProductIdIn(List<Long> productIds);
}
