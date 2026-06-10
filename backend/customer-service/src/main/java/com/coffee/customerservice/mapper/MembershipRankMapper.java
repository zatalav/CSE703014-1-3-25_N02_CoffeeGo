package com.coffee.customerservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.customerservice.entity.MembershipRank;
import com.coffee.customerservice.dto.request.MembershipRankRequest;
import com.coffee.customerservice.dto.response.MembershipRankResponse;
import org.springframework.stereotype.Component;

@Component
public class MembershipRankMapper implements DtoMapper<MembershipRank, MembershipRankRequest, MembershipRankResponse> {
    @Override
    public MembershipRank toEntity(MembershipRankRequest request) {
        MembershipRank entity = new MembershipRank();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(MembershipRank entity, MembershipRankRequest request) {
        if (request == null) {
            return;
        }
        entity.setRankName(request.getRankName());
        entity.setRankOrder(request.getRankOrder());
        entity.setMinExp(request.getMinExp());
        entity.setMinTotalMoney(request.getMinTotalMoney() == null ? 0L : request.getMinTotalMoney());
        entity.setMinTotalOrders(request.getMinTotalOrders() == null ? 0 : request.getMinTotalOrders());
        entity.setDiscountPercent(request.getDiscountPercent());
        entity.setExpMultiplier(request.getExpMultiplier());
        entity.setDripsMultiplier(request.getDripsMultiplier());
        entity.setDescription(request.getDescription());
        entity.setStatus(request.getStatus());
        entity.setColor(request.getColor());
        entity.setIcon(request.getIcon());
    }

    @Override
    public MembershipRankResponse toResponse(MembershipRank entity) {
        if (entity == null) {
            return null;
        }
        MembershipRankResponse response = new MembershipRankResponse();
        response.setRankId(entity.getRankId());
        response.setRankName(entity.getRankName());
        response.setRankOrder(entity.getRankOrder());
        response.setMinExp(entity.getMinExp());
        response.setMinTotalMoney(entity.getMinTotalMoney());
        response.setMinTotalOrders(entity.getMinTotalOrders());
        response.setDiscountPercent(entity.getDiscountPercent());
        response.setExpMultiplier(entity.getExpMultiplier());
        response.setDripsMultiplier(entity.getDripsMultiplier());
        response.setDescription(entity.getDescription());
        response.setStatus(entity.getStatus());
        response.setColor(entity.getColor());
        response.setIcon(entity.getIcon());
        return response;
    }
}
