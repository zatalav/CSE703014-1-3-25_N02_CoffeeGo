package com.coffee.customerservice.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import com.coffee.customerservice.entity.PointHistory;
    import com.coffee.customerservice.repository.CustomerLoyaltyRepository;
    import com.coffee.customerservice.repository.PointHistoryRepository;
    import java.time.LocalDateTime;
    import java.util.Map;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PatchMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/customers")
    @PreAuthorize("hasRole('admin')")
    public class CustomerOperationsController {
        private final CustomerLoyaltyRepository loyaltyRepository;
        private final PointHistoryRepository pointHistoryRepository;

        public CustomerOperationsController(CustomerLoyaltyRepository loyaltyRepository, PointHistoryRepository pointHistoryRepository) {
            this.loyaltyRepository = loyaltyRepository;
            this.pointHistoryRepository = pointHistoryRepository;
        }

        @GetMapping("/{id}/loyalty")
        public ApiResponse<?> loyalty(@PathVariable Long id) {
            return ApiResponse.success(loyaltyRepository.findById(id).orElse(null));
        }

        @GetMapping("/{id}/point-history")
        public ApiResponse<?> pointHistory(@PathVariable Long id) {
            return ApiResponse.success(pointHistoryRepository.findAll().stream().filter(item -> id.equals(item.getCustomerId())).toList());
        }

        @PatchMapping("/{id}/adjust-points")
        public ApiResponse<?> adjustPoints(@PathVariable Long id, @RequestBody Map<String, Object> request) {
            String reason = String.valueOf(request.getOrDefault("reason", ""));
            if (reason.isBlank()) {
                throw new BadRequestException("Reason is required when adjusting points");
            }
            String pointType = String.valueOf(request.getOrDefault("pointType", "drips"));
            Integer amount = Integer.valueOf(String.valueOf(request.getOrDefault("amount", "0")));
            PointHistory history = new PointHistory();
            history.setCustomerId(id);
            history.setPointType(pointType);
            history.setAction(amount >= 0 ? "earn" : "spend");
            history.setAmount(Math.abs(amount));
            history.setRemainingAmount(0);
            history.setNote(reason);
            history.setCreatedAt(LocalDateTime.now());
            history.setStatus("active");
            return ApiResponse.success(pointHistoryRepository.save(history));
        }
    }
