package com.coffee.customerservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.customerservice.entity.Customer;
import com.coffee.customerservice.mapper.CustomerMapper;
import com.coffee.customerservice.repository.CustomerRepository;
import com.coffee.customerservice.dto.request.CustomerRequest;
import com.coffee.customerservice.dto.response.CustomerResponse;
import com.coffee.customerservice.service.CustomerAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CustomerAdminServiceImpl extends CrudServiceSupport<Customer, Long, CustomerRequest, CustomerResponse> implements CustomerAdminService {
    public CustomerAdminServiceImpl(CustomerRepository repository, CustomerMapper mapper) {
        super(repository, repository, mapper, Customer.class, "id", List.of("name"), Map.of("status", "status"), "createdAt");
    }
}
