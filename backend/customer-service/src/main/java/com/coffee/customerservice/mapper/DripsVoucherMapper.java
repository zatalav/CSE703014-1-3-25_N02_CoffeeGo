package com.coffee.customerservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.customerservice.entity.DripsVoucher;
import com.coffee.customerservice.dto.request.DripsVoucherRequest;
import com.coffee.customerservice.dto.response.DripsVoucherResponse;
import org.springframework.stereotype.Component;

@Component
public class DripsVoucherMapper implements DtoMapper<DripsVoucher, DripsVoucherRequest, DripsVoucherResponse> {
    @Override
    public DripsVoucher toEntity(DripsVoucherRequest request) {
        DripsVoucher entity = new DripsVoucher();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(DripsVoucher entity, DripsVoucherRequest request) {
        if (request == null) {
            return;
        }
        entity.setCouponId(request.getCouponId());
        entity.setDripsRequired(request.getDripsRequired());
        entity.setQuantity(request.getQuantity());
        entity.setExchanged(request.getExchanged());
        entity.setStatus(request.getStatus());
    }

    @Override
    public DripsVoucherResponse toResponse(DripsVoucher entity) {
        if (entity == null) {
            return null;
        }
        DripsVoucherResponse response = new DripsVoucherResponse();
        response.setVoucherId(entity.getVoucherId());
        response.setCouponId(entity.getCouponId());
        response.setDripsRequired(entity.getDripsRequired());
        response.setQuantity(entity.getQuantity());
        response.setExchanged(entity.getExchanged());
        response.setStatus(entity.getStatus());
        return response;
    }
}
