package com.coffee.orderservice.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import com.coffee.orderservice.entity.OrderEntity;
    import com.coffee.orderservice.repository.OrderEntityRepository;
    import com.coffee.orderservice.repository.PaymentRepository;
    import com.coffee.orderservice.service.CustomerRewardService;
    import java.util.Map;
    import java.util.Set;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PatchMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/orders")
    @PreAuthorize("hasRole('admin')")
    public class OrderOperationsController {
        private final OrderEntityRepository orderRepository;
        private final PaymentRepository paymentRepository;
        private final CustomerRewardService rewardService;

        public OrderOperationsController(OrderEntityRepository orderRepository, PaymentRepository paymentRepository,
                                         CustomerRewardService rewardService) {
            this.orderRepository = orderRepository;
            this.paymentRepository = paymentRepository;
            this.rewardService = rewardService;
        }

        @PatchMapping("/{id}/status")
        public ApiResponse<OrderEntity> status(@PathVariable Long id, @RequestBody Map<String, String> request) {
            OrderEntity order = orderRepository.findById(id).orElseThrow(() -> new BadRequestException("Order not found"));
            String next = request.get("status");
            if (!allowed(order.getStatus(), next)) {
                throw new BadRequestException("Invalid order status transition");
            }
            order.setStatus(next);
            order = orderRepository.save(order);
            rewardService.awardIfCompleted(order);
            return ApiResponse.success(order);
        }

        @GetMapping("/{id}/payment")
        public ApiResponse<?> payment(@PathVariable Long id) {
            return ApiResponse.success(paymentRepository.findAll().stream().filter(item -> id.equals(item.getOrderId())).findFirst().orElse(null));
        }

        @GetMapping("/statistics")
        public ApiResponse<?> statistics() {
            long total = orderRepository.count();
            long completed = orderRepository.findAll().stream().filter(o -> "completed".equalsIgnoreCase(o.getStatus())).count();
            long cancelled = orderRepository.findAll().stream().filter(o -> "cancelled".equalsIgnoreCase(o.getStatus())).count();
            return ApiResponse.success(Map.of("totalOrders", total, "completedOrders", completed, "cancelledOrders", cancelled));
        }

        private boolean allowed(String current, String next) {
            if (next == null) return false;
            if ("cancelled".equalsIgnoreCase(current) || "completed".equalsIgnoreCase(current)) return false;
            return Set.of("pending", "confirmed", "preparing", "delivering", "completed", "cancelled").contains(next);
        }
    }
