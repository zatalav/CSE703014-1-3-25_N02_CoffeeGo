package com.coffee.userservice.repository;

import com.coffee.userservice.entity.CustomerLoyalty;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerLoyaltyRepository extends JpaRepository<CustomerLoyalty, Long>, JpaSpecificationExecutor<CustomerLoyalty> {
}
