package com.coffee.customerservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.customerservice.dto.response.DripsVoucherResponse;
import com.coffee.customerservice.mapper.DripsVoucherMapper;
import com.coffee.customerservice.repository.DripsVoucherRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers/drips-vouchers")
public class DripsVoucherController {
    private final DripsVoucherRepository repository;
    private final DripsVoucherMapper mapper;

    public DripsVoucherController(DripsVoucherRepository repository, DripsVoucherMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @GetMapping
    public ApiResponse<List<DripsVoucherResponse>> list() {
        List<DripsVoucherResponse> vouchers = repository.findAll(Sort.by(Sort.Direction.ASC, "dripsRequired")).stream()
                .filter(voucher -> voucher.getStatus() == null || "active".equalsIgnoreCase(voucher.getStatus()))
                .filter(voucher -> voucher.getQuantity() == null
                        || voucher.getExchanged() == null
                        || voucher.getExchanged() < voucher.getQuantity())
                .map(mapper::toResponse)
                .toList();
        return ApiResponse.success(vouchers);
    }
}
