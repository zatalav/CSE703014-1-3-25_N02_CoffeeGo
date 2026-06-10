package com.coffee.inventoryservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.inventoryservice.entity.SupplierDetail;
import com.coffee.inventoryservice.dto.request.SupplierDetailRequest;
import com.coffee.inventoryservice.dto.response.SupplierDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class SupplierDetailMapper implements DtoMapper<SupplierDetail, SupplierDetailRequest, SupplierDetailResponse> {
    @Override
    public SupplierDetail toEntity(SupplierDetailRequest request) {
        SupplierDetail entity = new SupplierDetail();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(SupplierDetail entity, SupplierDetailRequest request) {
        if (request == null) {
            return;
        }
        entity.setSupplierId(request.getSupplierId());
        entity.setContactPerson(request.getContactPerson());
        entity.setPhone(request.getPhone());
        entity.setEmail(request.getEmail());
        entity.setDeliveryTime(request.getDeliveryTime());
    }

    @Override
    public SupplierDetailResponse toResponse(SupplierDetail entity) {
        if (entity == null) {
            return null;
        }
        SupplierDetailResponse response = new SupplierDetailResponse();
        response.setSupplierId(entity.getSupplierId());
        response.setContactPerson(entity.getContactPerson());
        response.setPhone(entity.getPhone());
        response.setEmail(entity.getEmail());
        response.setDeliveryTime(entity.getDeliveryTime());
        return response;
    }
}
