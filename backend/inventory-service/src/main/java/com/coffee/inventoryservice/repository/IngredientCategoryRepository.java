package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.IngredientCategory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface IngredientCategoryRepository extends JpaRepository<IngredientCategory, Long>, JpaSpecificationExecutor<IngredientCategory> {
}
