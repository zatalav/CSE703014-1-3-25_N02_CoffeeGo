package com.coffee.orderservice.repository;

import com.coffee.orderservice.entity.PointHistory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface PointHistoryRepository extends JpaRepository<PointHistory, Long>, JpaSpecificationExecutor<PointHistory> {
    boolean existsByOrderIdAndPointTypeAndAction(Long orderId, String pointType, String action);
}
