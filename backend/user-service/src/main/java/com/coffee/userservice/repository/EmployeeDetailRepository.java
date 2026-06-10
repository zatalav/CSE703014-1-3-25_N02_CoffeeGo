package com.coffee.userservice.repository;

import com.coffee.userservice.entity.EmployeeDetail;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeDetailRepository extends JpaRepository<EmployeeDetail, Long>, JpaSpecificationExecutor<EmployeeDetail> {
    Optional<EmployeeDetail> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<EmployeeDetail> findByPhoneNumber(String phoneNumber);
    boolean existsByPhoneNumber(String phoneNumber);
}
