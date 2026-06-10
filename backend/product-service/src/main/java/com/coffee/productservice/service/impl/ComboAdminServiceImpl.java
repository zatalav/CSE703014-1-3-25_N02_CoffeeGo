package com.coffee.productservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.productservice.entity.Combo;
import com.coffee.productservice.mapper.ComboMapper;
import com.coffee.productservice.repository.ComboRepository;
import com.coffee.productservice.dto.request.ComboRequest;
import com.coffee.productservice.dto.response.ComboResponse;
import com.coffee.productservice.service.ComboAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ComboAdminServiceImpl extends CrudServiceSupport<Combo, Long, ComboRequest, ComboResponse> implements ComboAdminService {
    public ComboAdminServiceImpl(ComboRepository repository, ComboMapper mapper) {
        super(repository, repository, mapper, Combo.class, "combo_id", List.of("comboName", "description"), Map.of("status", "status"), "startDate");
    }
}
