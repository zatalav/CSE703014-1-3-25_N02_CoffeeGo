package com.coffee.customerservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.customerservice.entity.MembershipRank;
import com.coffee.customerservice.mapper.MembershipRankMapper;
import com.coffee.customerservice.repository.MembershipRankRepository;
import com.coffee.customerservice.dto.request.MembershipRankRequest;
import com.coffee.customerservice.dto.response.MembershipRankResponse;
import com.coffee.customerservice.service.MembershipRankAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class MembershipRankAdminServiceImpl extends CrudServiceSupport<MembershipRank, Long, MembershipRankRequest, MembershipRankResponse> implements MembershipRankAdminService {
    public MembershipRankAdminServiceImpl(MembershipRankRepository repository, MembershipRankMapper mapper) {
        super(repository, repository, mapper, MembershipRank.class, "rank_id", List.of("rankName", "description"), Map.of("status", "status", "rankId", "rankId"), null);
    }
}
