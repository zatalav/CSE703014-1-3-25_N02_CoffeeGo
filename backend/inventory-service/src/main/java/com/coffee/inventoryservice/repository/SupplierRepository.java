package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.Supplier;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {
    Optional<Supplier> findBySupplierName(String supplierName);
    boolean existsBySupplierName(String supplierName);
}
