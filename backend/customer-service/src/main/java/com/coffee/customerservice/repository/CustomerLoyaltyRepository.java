package com.coffee.customerservice.repository;

import com.coffee.customerservice.entity.CustomerLoyalty;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerLoyaltyRepository extends JpaRepository<CustomerLoyalty, Long>, JpaSpecificationExecutor<CustomerLoyalty> {
}
