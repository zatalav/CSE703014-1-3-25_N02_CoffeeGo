package com.coffee.authservice.repository;

import com.coffee.authservice.entity.CustomerDetail;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerDetailRepository extends JpaRepository<CustomerDetail, Long>, JpaSpecificationExecutor<CustomerDetail> {
    Optional<CustomerDetail> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<CustomerDetail> findByPhoneNumber(String phoneNumber);
    boolean existsByPhoneNumber(String phoneNumber);
}
