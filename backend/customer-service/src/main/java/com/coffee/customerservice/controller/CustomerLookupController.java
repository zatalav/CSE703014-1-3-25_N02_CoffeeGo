package com.coffee.customerservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.customerservice.entity.Customer;
import com.coffee.customerservice.entity.CustomerDetail;
import com.coffee.customerservice.entity.CustomerLoyalty;
import com.coffee.customerservice.entity.MembershipRank;
import com.coffee.customerservice.entity.OrderEntity;
import com.coffee.customerservice.repository.CustomerDetailRepository;
import com.coffee.customerservice.repository.CustomerLoyaltyRepository;
import com.coffee.customerservice.repository.CustomerRepository;
import com.coffee.customerservice.repository.MembershipRankRepository;
import com.coffee.customerservice.repository.OrderEntityRepository;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
public class CustomerLookupController {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final CustomerRepository customerRepository;
    private final CustomerDetailRepository detailRepository;
    private final CustomerLoyaltyRepository loyaltyRepository;
    private final MembershipRankRepository rankRepository;
    private final OrderEntityRepository orderRepository;

    public CustomerLookupController(CustomerRepository customerRepository,
                                    CustomerDetailRepository detailRepository,
                                    CustomerLoyaltyRepository loyaltyRepository,
                                    MembershipRankRepository rankRepository,
                                    OrderEntityRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.detailRepository = detailRepository;
        this.loyaltyRepository = loyaltyRepository;
        this.rankRepository = rankRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping("/search")
    public ApiResponse<List<CustomerLookupResponse>> search(@RequestParam String keyword,
                                                            @RequestParam(defaultValue = "20") Integer size) {
        String q = normalize(keyword);
        int max = Math.max(1, Math.min(size == null ? 20 : size, 100));
        List<CustomerLookupResponse> results = customerRepository.findAll().stream()
                .filter(customer -> !"inactive".equalsIgnoreCase(customer.getStatus()))
                .filter(customer -> matches(customer, q))
                .sorted(Comparator.comparing(Customer::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .limit(max)
                .map(this::toResponse)
                .toList();
        return ApiResponse.success(results);
    }

    private boolean matches(Customer customer, String q) {
        if (q.isBlank()) return false;
        CustomerDetail detail = detailRepository.findById(customer.getId()).orElse(null);
        return normalize(customer.getName()).contains(q)
                || (detail != null && normalize(detail.getEmail()).contains(q))
                || (detail != null && normalize(detail.getPhoneNumber()).contains(q));
    }

    private CustomerLookupResponse toResponse(Customer customer) {
        CustomerLookupResponse response = new CustomerLookupResponse();
        response.id = customer.getId();
        response.name = customer.getName();
        CustomerDetail detail = detailRepository.findById(customer.getId()).orElse(null);
        if (detail != null) {
            response.email = detail.getEmail();
            response.phone = detail.getPhoneNumber();
        }

        CustomerLoyalty loyalty = loyaltyRepository.findById(customer.getId()).orElse(null);
        if (loyalty != null) {
            response.points = loyalty.getDripsPoint() == null ? 0 : loyalty.getDripsPoint();
            response.totalOrders = loyalty.getTotalOrders() == null ? 0 : loyalty.getTotalOrders();
            response.rank = rankRepository.findById(loyalty.getRankId())
                    .map(MembershipRank::getRankName)
                    .orElse("");
        }

        orderRepository.findAll().stream()
                .filter(order -> Objects.equals(customer.getId(), order.getCustomerId()))
                .map(OrderEntity::getCreatedAt)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .ifPresent(lastOrder -> response.lastOrder = DATE_FORMATTER.format(lastOrder));

        return response;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    public static class CustomerLookupResponse {
        public Long id;
        public String name;
        public String phone = "";
        public String email = "";
        public Integer points = 0;
        public String rank = "";
        public Integer totalOrders = 0;
        public String lastOrder = "";
    }
}
