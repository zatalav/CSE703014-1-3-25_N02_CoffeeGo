package com.coffee.branchservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.branchservice.entity.WorkSchedule;
import com.coffee.branchservice.dto.request.WorkScheduleRequest;
import com.coffee.branchservice.dto.response.WorkScheduleResponse;
import org.springframework.stereotype.Component;

@Component
public class WorkScheduleMapper implements DtoMapper<WorkSchedule, WorkScheduleRequest, WorkScheduleResponse> {
    @Override
    public WorkSchedule toEntity(WorkScheduleRequest request) {
        WorkSchedule entity = new WorkSchedule();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(WorkSchedule entity, WorkScheduleRequest request) {
        if (request == null) {
            return;
        }
        entity.setEmployeeId(request.getEmployeeId());
        entity.setBranchId(request.getBranchId());
        entity.setWorkDate(request.getWorkDate());
        entity.setShift(request.getShift());
        entity.setStartTime(request.getStartTime());
        entity.setEndTime(request.getEndTime());
        entity.setStatus(request.getStatus());
        entity.setNote(request.getNote());
        entity.setCreatedAt(request.getCreatedAt());
    }

    @Override
    public WorkScheduleResponse toResponse(WorkSchedule entity) {
        if (entity == null) {
            return null;
        }
        WorkScheduleResponse response = new WorkScheduleResponse();
        response.setScheduleId(entity.getScheduleId());
        response.setEmployeeId(entity.getEmployeeId());
        response.setBranchId(entity.getBranchId());
        response.setWorkDate(entity.getWorkDate());
        response.setShift(entity.getShift());
        response.setStartTime(entity.getStartTime());
        response.setEndTime(entity.getEndTime());
        response.setStatus(entity.getStatus());
        response.setNote(entity.getNote());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
