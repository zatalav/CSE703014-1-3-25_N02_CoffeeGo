package com.coffee.productservice.repository;

import com.coffee.productservice.entity.Ingredient;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, Long>, JpaSpecificationExecutor<Ingredient> {
    Optional<Ingredient> findByIngredientName(String ingredientName);
    boolean existsByIngredientName(String ingredientName);
}
