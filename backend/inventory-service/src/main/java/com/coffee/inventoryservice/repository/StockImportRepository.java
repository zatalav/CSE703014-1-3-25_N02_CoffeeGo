package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.StockImport;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface StockImportRepository extends JpaRepository<StockImport, Long>, JpaSpecificationExecutor<StockImport> {
}
