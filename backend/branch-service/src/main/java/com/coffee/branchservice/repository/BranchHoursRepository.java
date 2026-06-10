package com.coffee.branchservice.repository;

import com.coffee.branchservice.entity.BranchHours;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface BranchHoursRepository extends JpaRepository<BranchHours, Long>, JpaSpecificationExecutor<BranchHours> {
    List<BranchHours> findByBranchIdOrderByHoursIdAsc(Long branchId);
    Optional<BranchHours> findByBranchIdAndDayOfWeek(Long branchId, String dayOfWeek);
}
