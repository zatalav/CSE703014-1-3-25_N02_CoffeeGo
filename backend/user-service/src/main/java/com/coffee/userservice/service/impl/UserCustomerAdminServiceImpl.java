package com.coffee.userservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.userservice.entity.Customer;
import com.coffee.userservice.entity.CustomerLoyalty;
import com.coffee.userservice.entity.MembershipRank;
import com.coffee.userservice.mapper.CustomerMapper;
import com.coffee.userservice.repository.CustomerLoyaltyRepository;
import com.coffee.userservice.repository.CustomerRepository;
import com.coffee.userservice.repository.MembershipRankRepository;
import com.coffee.userservice.dto.request.CustomerRequest;
import com.coffee.userservice.dto.response.CustomerResponse;
import com.coffee.userservice.service.UserCustomerAdminService;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserCustomerAdminServiceImpl extends CrudServiceSupport<Customer, Long, CustomerRequest, CustomerResponse> implements UserCustomerAdminService {
    private static final String DEFAULT_CUSTOMER_RANK = "Gold";

    private final CustomerLoyaltyRepository loyaltyRepository;
    private final MembershipRankRepository rankRepository;

    public UserCustomerAdminServiceImpl(CustomerRepository repository,
                                        CustomerMapper mapper,
                                        CustomerLoyaltyRepository loyaltyRepository,
                                        MembershipRankRepository rankRepository) {
        super(repository, repository, mapper, Customer.class, "id", List.of("name"), Map.of("status", "status"), "createdAt");
        this.loyaltyRepository = loyaltyRepository;
        this.rankRepository = rankRepository;
    }

    @Override
    @Transactional
    public CustomerResponse create(CustomerRequest request) {
        CustomerResponse response = super.create(request);
        ensureDefaultLoyalty(response.getId());
        return super.get(response.getId());
    }

    private void ensureDefaultLoyalty(Long customerId) {
        if (customerId == null || loyaltyRepository.existsById(customerId)) {
            return;
        }
        CustomerLoyalty loyalty = new CustomerLoyalty();
        loyalty.setCustomerId(customerId);
        loyalty.setRankId(defaultRankId());
        loyalty.setExpPoint(0);
        loyalty.setDripsPoint(0);
        loyalty.setTotalMoney(0L);
        loyalty.setTotalOrders(0);
        loyalty.setUpdatedAt(LocalDateTime.now());
        loyaltyRepository.save(loyalty);
    }

    private Long defaultRankId() {
        return rankRepository.findByRankName(DEFAULT_CUSTOMER_RANK)
                .map(MembershipRank::getRankId)
                .orElseGet(() -> rankRepository.findAll().stream()
                        .filter(rank -> rank.getStatus() == null || "active".equalsIgnoreCase(rank.getStatus()))
                        .sorted(Comparator.comparing(rank -> rank.getRankOrder() == null ? Integer.MAX_VALUE : rank.getRankOrder()))
                        .map(MembershipRank::getRankId)
                        .findFirst()
                        .orElse(1L));
    }
}
