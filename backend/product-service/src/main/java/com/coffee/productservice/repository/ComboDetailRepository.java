package com.coffee.productservice.repository;

import com.coffee.productservice.entity.ComboDetail;
import com.coffee.productservice.entity.ComboDetailId;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ComboDetailRepository extends JpaRepository<ComboDetail, ComboDetailId>, JpaSpecificationExecutor<ComboDetail> {
}
