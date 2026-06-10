package com.coffee.customerservice.controller;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.ApiResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.customerservice.entity.Customer;
import com.coffee.customerservice.entity.CustomerDetail;
import com.coffee.customerservice.repository.CustomerDetailRepository;
import com.coffee.customerservice.repository.CustomerRepository;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers/{customerId}/profile")
public class CustomerProfileController {
    private final CustomerRepository customerRepository;
    private final CustomerDetailRepository detailRepository;

    public CustomerProfileController(CustomerRepository customerRepository, CustomerDetailRepository detailRepository) {
        this.customerRepository = customerRepository;
        this.detailRepository = detailRepository;
    }

    @GetMapping
    public ApiResponse<CustomerProfileResponse> get(@PathVariable Long customerId,
                                                    @AuthenticationPrincipal AuthenticatedUser user) {
        requireCustomerAccess(customerId, user);
        return ApiResponse.success(toResponse(customerId));
    }

    @PatchMapping
    @Transactional
    public ApiResponse<CustomerProfileResponse> update(@PathVariable Long customerId,
                                                       @RequestBody CustomerProfileRequest request,
                                                       @AuthenticationPrincipal AuthenticatedUser user) {
        requireCustomerAccess(customerId, user);
        if (request == null) {
            throw new BadRequestException("Profile payload is required");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer not found"));
        CustomerDetail detail = detailRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer detail not found"));

        if (hasText(request.name)) {
            customer.setName(request.name.trim());
        }
        if (hasText(request.gender)) {
            customer.setGender(request.gender.trim());
        }
        if (hasText(request.dateOfBirth)) {
            customer.setDateOfBirth(LocalDate.parse(request.dateOfBirth.trim()));
        }
        if (hasText(request.email) && !request.email.trim().equalsIgnoreCase(detail.getEmail())) {
            detailRepository.findByEmail(request.email.trim())
                    .filter(existing -> !Objects.equals(existing.getCustomerId(), customerId))
                    .ifPresent(existing -> {
                        throw new BadRequestException("Email already exists");
                    });
            detail.setEmail(request.email.trim());
        }
        if (hasText(request.phoneNumber) && !request.phoneNumber.trim().equalsIgnoreCase(nullToBlank(detail.getPhoneNumber()))) {
            detailRepository.findByPhoneNumber(request.phoneNumber.trim())
                    .filter(existing -> !Objects.equals(existing.getCustomerId(), customerId))
                    .ifPresent(existing -> {
                        throw new BadRequestException("Phone number already exists");
                    });
            detail.setPhoneNumber(request.phoneNumber.trim());
        }

        if (request.hasAddressPayload()) {
            detail.setAddressLabel(blankToNull(request.addressLabel));
            detail.setAddressDetail(blankToNull(request.addressDetail));
            detail.setAddressWard(blankToNull(request.addressWard));
            detail.setAddressDistrict(blankToNull(request.addressDistrict));
            detail.setAddressProvince(blankToNull(request.addressProvince));
            detail.setAddressWardCode(request.addressWardCode);
            detail.setAddressDistrictCode(request.addressDistrictCode);
            detail.setAddressProvinceCode(request.addressProvinceCode);
            detail.setAddressLat(request.addressLat);
            detail.setAddressLng(request.addressLng);
            detail.setAddress(composeAddress(request));
        }

        detail.setUpdatedAt(LocalDateTime.now());
        customerRepository.save(customer);
        detailRepository.save(detail);
        return ApiResponse.success("Updated", toResponse(customerId));
    }

    private void requireCustomerAccess(Long customerId, AuthenticatedUser user) {
        if (customerId == null) {
            throw new BadRequestException("customerId is required");
        }
        if (user == null || user.getUserId() == null) {
            throw new BadRequestException("Customer login is required");
        }
        if (isAdmin(user.getRoleName())) {
            return;
        }
        if (!isCustomerRole(user.getRoleName()) || !Objects.equals(customerId, user.getUserId())) {
            throw new BadRequestException("Profile does not belong to this customer");
        }
    }

    private CustomerProfileResponse toResponse(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer not found"));
        CustomerDetail detail = detailRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer detail not found"));

        CustomerProfileResponse response = new CustomerProfileResponse();
        response.id = customer.getId();
        response.name = customer.getName();
        response.gender = customer.getGender();
        response.dateOfBirth = customer.getDateOfBirth() == null ? null : customer.getDateOfBirth().toString();
        response.email = detail.getEmail();
        response.phoneNumber = detail.getPhoneNumber();
        response.address = detail.getAddress();
        response.addressLabel = detail.getAddressLabel();
        response.addressDetail = detail.getAddressDetail();
        response.addressWard = detail.getAddressWard();
        response.addressDistrict = detail.getAddressDistrict();
        response.addressProvince = detail.getAddressProvince();
        response.addressWardCode = detail.getAddressWardCode();
        response.addressDistrictCode = detail.getAddressDistrictCode();
        response.addressProvinceCode = detail.getAddressProvinceCode();
        response.addressLat = detail.getAddressLat();
        response.addressLng = detail.getAddressLng();
        response.updatedAt = detail.getUpdatedAt();
        return response;
    }

    private String composeAddress(CustomerProfileRequest request) {
        if (hasText(request.address)) {
            return request.address.trim();
        }
        List<String> parts = List.of(
                nullToBlank(request.addressDetail),
                nullToBlank(request.addressWard),
                nullToBlank(request.addressDistrict),
                nullToBlank(request.addressProvince)
        );
        String address = String.join(", ", parts.stream().filter(this::hasText).toList());
        return address.isBlank() ? null : address;
    }

    private boolean isCustomerRole(String roleName) {
        String normalized = normalizeRole(roleName).replace('_', ' ');
        return "customer".equals(normalized) || normalized.contains("khach hang") || normalized.contains("customer");
    }

    private boolean isAdmin(String roleName) {
        String normalized = normalizeRole(roleName).replace('_', ' ');
        return "admin".equals(normalized) || normalized.contains("quan tri");
    }

    private String normalizeRole(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }

    private String blankToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    public static class CustomerProfileRequest {
        public String name;
        public String gender;
        public String dateOfBirth;
        public String email;
        public String phoneNumber;
        public String address;
        public String addressLabel;
        public String addressDetail;
        public String addressWard;
        public String addressDistrict;
        public String addressProvince;
        public Integer addressWardCode;
        public Integer addressDistrictCode;
        public Integer addressProvinceCode;
        public Double addressLat;
        public Double addressLng;

        public boolean hasAddressPayload() {
            return address != null
                    || addressLabel != null
                    || addressDetail != null
                    || addressWard != null
                    || addressDistrict != null
                    || addressProvince != null
                    || addressWardCode != null
                    || addressDistrictCode != null
                    || addressProvinceCode != null
                    || addressLat != null
                    || addressLng != null;
        }
    }

    public static class CustomerProfileResponse {
        public Long id;
        public String name;
        public String gender;
        public String dateOfBirth;
        public String email;
        public String phoneNumber;
        public String address;
        public String addressLabel;
        public String addressDetail;
        public String addressWard;
        public String addressDistrict;
        public String addressProvince;
        public Integer addressWardCode;
        public Integer addressDistrictCode;
        public Integer addressProvinceCode;
        public Double addressLat;
        public Double addressLng;
        public LocalDateTime updatedAt;
    }
}
