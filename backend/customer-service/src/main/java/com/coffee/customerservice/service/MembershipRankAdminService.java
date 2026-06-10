package com.coffee.customerservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.customerservice.dto.request.MembershipRankRequest;
import com.coffee.customerservice.dto.response.MembershipRankResponse;

public interface MembershipRankAdminService extends CrudService<MembershipRankRequest, MembershipRankResponse, Long> {
}
