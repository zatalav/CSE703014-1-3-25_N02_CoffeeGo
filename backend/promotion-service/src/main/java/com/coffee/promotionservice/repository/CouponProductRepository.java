package com.coffee.promotionservice.repository;

import com.coffee.promotionservice.entity.CouponProduct;
import com.coffee.promotionservice.entity.CouponProductId;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CouponProductRepository extends JpaRepository<CouponProduct, CouponProductId>, JpaSpecificationExecutor<CouponProduct> {
}
