package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.WarehouseStock;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface WarehouseStockRepository extends JpaRepository<WarehouseStock, Long>, JpaSpecificationExecutor<WarehouseStock> {
    List<WarehouseStock> findByBranchIdAndIngredientIdOrderByStockIdAsc(Long branchId, Long ingredientId);
    Optional<WarehouseStock> findFirstByBranchIdAndIngredientIdOrderByStockIdAsc(Long branchId, Long ingredientId);
}
