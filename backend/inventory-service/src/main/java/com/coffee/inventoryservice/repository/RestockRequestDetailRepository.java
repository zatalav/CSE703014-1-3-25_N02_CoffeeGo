package com.coffee.inventoryservice.repository;

import com.coffee.inventoryservice.entity.RestockRequestDetail;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RestockRequestDetailRepository extends JpaRepository<RestockRequestDetail, Long> {
    List<RestockRequestDetail> findByRequestIdOrderByRequestDetailIdAsc(Long requestId);
    void deleteByRequestId(Long requestId);
}
