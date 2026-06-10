package com.coffee.productservice.repository;

import com.coffee.productservice.entity.SeasonalProduct;
import com.coffee.productservice.entity.SeasonalProductId;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SeasonalProductRepository extends JpaRepository<SeasonalProduct, SeasonalProductId>, JpaSpecificationExecutor<SeasonalProduct> {
}
