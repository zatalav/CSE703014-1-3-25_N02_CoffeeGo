package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.RestockRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface RestockRequestRepository extends JpaRepository<RestockRequest, Long>, JpaSpecificationExecutor<RestockRequest> {
}
