package com.coffee.userservice.repository;

import com.coffee.userservice.entity.Branch;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long>, JpaSpecificationExecutor<Branch> {
    Optional<Branch> findByBranchName(String branchName);
    boolean existsByBranchName(String branchName);
    Optional<Branch> findByEmail(String email);
    boolean existsByEmail(String email);
}
