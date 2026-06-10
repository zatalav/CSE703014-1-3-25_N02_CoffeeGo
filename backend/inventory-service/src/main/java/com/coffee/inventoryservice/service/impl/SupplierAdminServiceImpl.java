package com.coffee.inventoryservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.inventoryservice.entity.Supplier;
import com.coffee.inventoryservice.mapper.SupplierMapper;
import com.coffee.inventoryservice.repository.SupplierRepository;
import com.coffee.inventoryservice.dto.request.SupplierRequest;
import com.coffee.inventoryservice.dto.response.SupplierResponse;
import com.coffee.inventoryservice.service.SupplierAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SupplierAdminServiceImpl extends CrudServiceSupport<Supplier, Long, SupplierRequest, SupplierResponse> implements SupplierAdminService {
    public SupplierAdminServiceImpl(SupplierRepository repository, SupplierMapper mapper) {
        super(repository, repository, mapper, Supplier.class, "supplier_id", List.of("supplierName", "address", "description"), Map.of("status", "status", "supplierId", "supplierId"), null);
    }
}
