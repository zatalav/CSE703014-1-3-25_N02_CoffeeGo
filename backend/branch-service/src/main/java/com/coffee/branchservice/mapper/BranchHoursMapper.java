package com.coffee.branchservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.branchservice.entity.BranchHours;
import com.coffee.branchservice.dto.request.BranchHoursRequest;
import com.coffee.branchservice.dto.response.BranchHoursResponse;
import org.springframework.stereotype.Component;

@Component
public class BranchHoursMapper implements DtoMapper<BranchHours, BranchHoursRequest, BranchHoursResponse> {
    @Override
    public BranchHours toEntity(BranchHoursRequest request) {
        BranchHours entity = new BranchHours();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(BranchHours entity, BranchHoursRequest request) {
        if (request == null) {
            return;
        }
        entity.setBranchId(request.getBranchId());
        entity.setDayOfWeek(request.getDayOfWeek());
        entity.setOpenTime(request.getOpenTime());
        entity.setCloseTime(request.getCloseTime());
        entity.setIsClosed(request.getIsClosed());
    }

    @Override
    public BranchHoursResponse toResponse(BranchHours entity) {
        if (entity == null) {
            return null;
        }
        BranchHoursResponse response = new BranchHoursResponse();
        response.setHoursId(entity.getHoursId());
        response.setBranchId(entity.getBranchId());
        response.setDayOfWeek(entity.getDayOfWeek());
        response.setOpenTime(entity.getOpenTime());
        response.setCloseTime(entity.getCloseTime());
        response.setIsClosed(entity.getIsClosed());
        return response;
    }
}
