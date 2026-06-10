package com.coffee.orderservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.orderservice.entity.Payment;
import com.coffee.orderservice.dto.request.PaymentRequest;
import com.coffee.orderservice.dto.response.PaymentResponse;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper implements DtoMapper<Payment, PaymentRequest, PaymentResponse> {
    @Override
    public Payment toEntity(PaymentRequest request) {
        Payment entity = new Payment();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Payment entity, PaymentRequest request) {
        if (request == null) {
            return;
        }
        entity.setOrderId(request.getOrderId());
        entity.setMethod(request.getMethod());
        entity.setProvider(request.getProvider());
        entity.setAmount(request.getAmount());
        entity.setDiscount(request.getDiscount());
        entity.setDripsUsed(request.getDripsUsed());
        entity.setStatus(request.getStatus());
        entity.setPaidAt(request.getPaidAt());
    }

    @Override
    public PaymentResponse toResponse(Payment entity) {
        if (entity == null) {
            return null;
        }
        PaymentResponse response = new PaymentResponse();
        response.setPaymentId(entity.getPaymentId());
        response.setOrderId(entity.getOrderId());
        response.setMethod(entity.getMethod());
        response.setProvider(entity.getProvider());
        response.setAmount(entity.getAmount());
        response.setDiscount(entity.getDiscount());
        response.setDripsUsed(entity.getDripsUsed());
        response.setStatus(entity.getStatus());
        response.setPaidAt(entity.getPaidAt());
        return response;
    }
}
