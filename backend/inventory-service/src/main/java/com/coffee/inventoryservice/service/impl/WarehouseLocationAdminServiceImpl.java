package com.coffee.inventoryservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.inventoryservice.entity.WarehouseLocation;
import com.coffee.inventoryservice.mapper.WarehouseLocationMapper;
import com.coffee.inventoryservice.repository.WarehouseLocationRepository;
import com.coffee.inventoryservice.dto.request.WarehouseLocationRequest;
import com.coffee.inventoryservice.dto.response.WarehouseLocationResponse;
import com.coffee.inventoryservice.service.WarehouseLocationAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class WarehouseLocationAdminServiceImpl extends CrudServiceSupport<WarehouseLocation, Long, WarehouseLocationRequest, WarehouseLocationResponse> implements WarehouseLocationAdminService {
    public WarehouseLocationAdminServiceImpl(WarehouseLocationRepository repository, WarehouseLocationMapper mapper) {
        super(repository, repository, mapper, WarehouseLocation.class, "location_id", List.of("zone", "shelf", "slot"), Map.of("branchId", "branchId"), null);
    }
}
