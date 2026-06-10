package com.coffee.userservice.repository;

import com.coffee.userservice.entity.MembershipRank;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface MembershipRankRepository extends JpaRepository<MembershipRank, Long>, JpaSpecificationExecutor<MembershipRank> {
    Optional<MembershipRank> findByRankName(String rankName);
    boolean existsByRankName(String rankName);
    Optional<MembershipRank> findByRankOrder(Integer rankOrder);
    boolean existsByRankOrder(Integer rankOrder);
}
