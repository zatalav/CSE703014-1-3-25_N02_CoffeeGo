package com.coffee.productservice.repository;

import com.coffee.productservice.entity.RecipeDetail;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface RecipeDetailRepository extends JpaRepository<RecipeDetail, Long>, JpaSpecificationExecutor<RecipeDetail> {
    void deleteByRecipeIdIn(List<Long> recipeIds);
}
