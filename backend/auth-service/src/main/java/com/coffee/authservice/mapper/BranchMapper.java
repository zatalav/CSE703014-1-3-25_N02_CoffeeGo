package com.coffee.authservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.authservice.entity.Branch;
import com.coffee.authservice.dto.request.BranchRequest;
import com.coffee.authservice.dto.response.BranchResponse;
import org.springframework.stereotype.Component;

@Component
public class BranchMapper implements DtoMapper<Branch, BranchRequest, BranchResponse> {
    @Override
    public Branch toEntity(BranchRequest request) {
        Branch entity = new Branch();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Branch entity, BranchRequest request) {
        if (request == null) {
            return;
        }
        entity.setBranchName(request.getBranchName());
        entity.setAddress(request.getAddress());
        entity.setPhone(request.getPhone());
        entity.setEmail(request.getEmail());
        entity.setBranchType(request.getBranchType());
        entity.setStatus(request.getStatus());
    }

    @Override
    public BranchResponse toResponse(Branch entity) {
        if (entity == null) {
            return null;
        }
        BranchResponse response = new BranchResponse();
        response.setBranchId(entity.getBranchId());
        response.setBranchName(entity.getBranchName());
        response.setAddress(entity.getAddress());
        response.setPhone(entity.getPhone());
        response.setEmail(entity.getEmail());
        response.setBranchType(entity.getBranchType());
        response.setStatus(entity.getStatus());
        return response;
    }
}
