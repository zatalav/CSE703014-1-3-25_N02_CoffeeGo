package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.StockExportDetail;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface StockExportDetailRepository extends JpaRepository<StockExportDetail, Long>, JpaSpecificationExecutor<StockExportDetail> {
    List<StockExportDetail> findByExportIdOrderByExportDetailIdAsc(Long exportId);
    void deleteByExportId(Long exportId);
}
