package com.coffee.customerservice.repository;

import com.coffee.customerservice.entity.DripsExchangeHistory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface DripsExchangeHistoryRepository extends JpaRepository<DripsExchangeHistory, Long>, JpaSpecificationExecutor<DripsExchangeHistory> {
}
