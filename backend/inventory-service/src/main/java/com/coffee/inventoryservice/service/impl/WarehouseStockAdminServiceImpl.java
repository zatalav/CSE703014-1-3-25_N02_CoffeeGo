package com.coffee.inventoryservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.inventoryservice.entity.WarehouseStock;
import com.coffee.inventoryservice.mapper.WarehouseStockMapper;
import com.coffee.inventoryservice.repository.WarehouseStockRepository;
import com.coffee.inventoryservice.dto.request.WarehouseStockRequest;
import com.coffee.inventoryservice.dto.response.WarehouseStockResponse;
import com.coffee.inventoryservice.service.WarehouseStockAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class WarehouseStockAdminServiceImpl extends CrudServiceSupport<WarehouseStock, Long, WarehouseStockRequest, WarehouseStockResponse> implements WarehouseStockAdminService {
    public WarehouseStockAdminServiceImpl(WarehouseStockRepository repository, WarehouseStockMapper mapper) {
        super(repository, repository, mapper, WarehouseStock.class, "stock_id", List.of("unit"), Map.of("branchId", "branchId", "ingredientId", "ingredientId"), null);
    }
}
