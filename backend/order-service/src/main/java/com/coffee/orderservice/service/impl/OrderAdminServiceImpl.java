package com.coffee.orderservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.orderservice.entity.OrderEntity;
import com.coffee.orderservice.mapper.OrderEntityMapper;
import com.coffee.orderservice.repository.OrderEntityRepository;
import com.coffee.orderservice.dto.request.OrderEntityRequest;
import com.coffee.orderservice.dto.response.OrderEntityResponse;
import com.coffee.orderservice.service.OrderAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class OrderAdminServiceImpl extends CrudServiceSupport<OrderEntity, Long, OrderEntityRequest, OrderEntityResponse> implements OrderAdminService {
    public OrderAdminServiceImpl(OrderEntityRepository repository, OrderEntityMapper mapper) {
        super(repository, repository, mapper, OrderEntity.class, "order_id", List.of("note"), Map.of("branchId", "branchId", "status", "status", "customerId", "customerId", "employeeId", "employeeId"), "createdAt");
    }
}
