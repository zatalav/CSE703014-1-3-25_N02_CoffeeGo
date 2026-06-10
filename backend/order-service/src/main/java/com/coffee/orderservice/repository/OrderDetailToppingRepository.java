package com.coffee.orderservice.repository;

import com.coffee.orderservice.entity.OrderDetailTopping;
import com.coffee.orderservice.entity.OrderDetailToppingId;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderDetailToppingRepository extends JpaRepository<OrderDetailTopping, OrderDetailToppingId>, JpaSpecificationExecutor<OrderDetailTopping> {
}
