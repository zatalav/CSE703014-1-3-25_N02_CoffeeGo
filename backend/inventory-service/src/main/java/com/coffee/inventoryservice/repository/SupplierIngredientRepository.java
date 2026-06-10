package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.SupplierIngredient;
import com.coffee.inventoryservice.entity.SupplierIngredientId;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierIngredientRepository extends JpaRepository<SupplierIngredient, SupplierIngredientId>, JpaSpecificationExecutor<SupplierIngredient> {
}
