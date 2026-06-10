package com.coffee.branchservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.branchservice.entity.Branch;
import com.coffee.branchservice.dto.request.BranchRequest;
import com.coffee.branchservice.dto.response.BranchResponse;
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
        entity.setAddressDetail(request.getAddressDetail());
        entity.setImgUrl(request.getImgUrl());
        entity.setLatitude(request.getLatitude());
        entity.setLongitude(request.getLongitude());
        entity.setMapUrl(request.getMapUrl());
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
        response.setAddressDetail(entity.getAddressDetail());
        response.setImgUrl(entity.getImgUrl());
        response.setLatitude(entity.getLatitude());
        response.setLongitude(entity.getLongitude());
        response.setMapUrl(entity.getMapUrl());
        response.setPhone(entity.getPhone());
        response.setEmail(entity.getEmail());
        response.setBranchType(entity.getBranchType());
        response.setStatus(entity.getStatus());
        return response;
    }
}
