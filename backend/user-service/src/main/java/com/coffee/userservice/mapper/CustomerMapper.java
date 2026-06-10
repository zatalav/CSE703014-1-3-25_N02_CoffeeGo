package com.coffee.userservice.mapper;

import com.coffee.common.mapper.DtoMapper;
import com.coffee.userservice.entity.Customer;
import com.coffee.userservice.entity.OrderEntity;
import com.coffee.userservice.dto.request.CustomerRequest;
import com.coffee.userservice.dto.response.CustomerResponse;
import com.coffee.userservice.repository.CustomerDetailRepository;
import com.coffee.userservice.repository.CustomerLoyaltyRepository;
import com.coffee.userservice.repository.MembershipRankRepository;
import com.coffee.userservice.repository.OrderEntityRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class CustomerMapper implements DtoMapper<Customer, CustomerRequest, CustomerResponse> {
    private static final String DEFAULT_CUSTOMER_RANK = "Gold";

    private final CustomerDetailRepository detailRepository;
    private final CustomerLoyaltyRepository loyaltyRepository;
    private final MembershipRankRepository rankRepository;
    private final OrderEntityRepository orderRepository;

    public CustomerMapper(CustomerDetailRepository detailRepository,
                          CustomerLoyaltyRepository loyaltyRepository,
                          MembershipRankRepository rankRepository,
                          OrderEntityRepository orderRepository) {
        this.detailRepository = detailRepository;
        this.loyaltyRepository = loyaltyRepository;
        this.rankRepository = rankRepository;
        this.orderRepository = orderRepository;
    }

    @Override
    public Customer toEntity(CustomerRequest request) {
        Customer entity = new Customer();
        updateEntity(entity, request);
        return entity;
    }

    @Override
    public void updateEntity(Customer entity, CustomerRequest request) {
        if (request == null) {
            return;
        }
        entity.setName(request.getName());
        entity.setGender(request.getGender());
        entity.setDateOfBirth(request.getDateOfBirth());
        if (entity.getId() == null || request.getStatus() != null) {
            entity.setStatus(request.getStatus() == null || request.getStatus().isBlank() ? "active" : request.getStatus());
        }
        if (entity.getId() == null || request.getCreatedAt() != null) {
            entity.setCreatedAt(request.getCreatedAt() == null ? LocalDateTime.now() : request.getCreatedAt());
        }
    }

    @Override
    public CustomerResponse toResponse(Customer entity) {
        if (entity == null) {
            return null;
        }
        CustomerResponse response = new CustomerResponse();
        response.setId(entity.getId());
        response.setName(entity.getName());
        response.setGender(entity.getGender());
        response.setDateOfBirth(entity.getDateOfBirth());
        response.setStatus(entity.getStatus());
        response.setCreatedAt(entity.getCreatedAt());
        response.setRankName(DEFAULT_CUSTOMER_RANK);
        response.setExpPoint(0);
        response.setDripsPoint(0);
        response.setTotalMoney(0L);
        response.setTotalOrders(0);
        detailRepository.findById(entity.getId()).ifPresent(detail -> {
            response.setEmail(detail.getEmail());
            response.setPhoneNumber(detail.getPhoneNumber());
            response.setAddress(detail.getAddress());
        });
        loyaltyRepository.findById(entity.getId()).ifPresent(loyalty -> {
            response.setExpPoint(loyalty.getExpPoint() == null ? 0 : loyalty.getExpPoint());
            response.setDripsPoint(loyalty.getDripsPoint() == null ? 0 : loyalty.getDripsPoint());
            response.setTotalMoney(loyalty.getTotalMoney() == null ? 0L : loyalty.getTotalMoney());
            response.setTotalOrders(loyalty.getTotalOrders() == null ? 0 : loyalty.getTotalOrders());
            if (loyalty.getRankId() != null) {
                rankRepository.findById(loyalty.getRankId())
                        .map(rank -> rank.getRankName())
                        .filter(rankName -> rankName != null && !rankName.isBlank())
                        .ifPresent(response::setRankName);
            }
        });
        orderRepository.findAll().stream()
                .filter(order -> Objects.equals(entity.getId(), order.getCustomerId()))
                .map(OrderEntity::getCreatedAt)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .ifPresent(response::setLastOrderAt);
        return response;
    }
}
