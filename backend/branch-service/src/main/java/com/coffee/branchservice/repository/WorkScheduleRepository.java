package com.coffee.branchservice.repository;

import com.coffee.branchservice.entity.WorkSchedule;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long>, JpaSpecificationExecutor<WorkSchedule> {
}
