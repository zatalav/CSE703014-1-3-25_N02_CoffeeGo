package com.coffee.orderservice.repository;

import com.coffee.orderservice.entity.MembershipRank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface MembershipRankRepository extends JpaRepository<MembershipRank, Long>, JpaSpecificationExecutor<MembershipRank> {
}
