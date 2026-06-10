package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.StockImportDetail;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface StockImportDetailRepository extends JpaRepository<StockImportDetail, Long>, JpaSpecificationExecutor<StockImportDetail> {
    List<StockImportDetail> findByImportIdOrderByImportDetailIdAsc(Long importId);
    void deleteByImportId(Long importId);
}
