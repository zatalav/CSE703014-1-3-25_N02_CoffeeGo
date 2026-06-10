package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.SupplierDetail;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierDetailRepository extends JpaRepository<SupplierDetail, Long>, JpaSpecificationExecutor<SupplierDetail> {
    Optional<SupplierDetail> findByEmail(String email);
    boolean existsByEmail(String email);
}
