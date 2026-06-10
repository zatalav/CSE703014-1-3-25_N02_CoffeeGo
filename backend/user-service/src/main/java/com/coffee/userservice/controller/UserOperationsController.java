package com.coffee.userservice.controller;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.userservice.repository.OrderEntityRepository;
    import com.coffee.userservice.repository.PointHistoryRepository;
    import java.util.List;
    import java.util.Map;
    import org.springframework.jdbc.core.JdbcTemplate;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PutMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/users")
    @PreAuthorize("hasRole('admin')")
    public class UserOperationsController {
        private final OrderEntityRepository orderRepository;
        private final PointHistoryRepository pointHistoryRepository;
        private final JdbcTemplate jdbcTemplate;

        public UserOperationsController(OrderEntityRepository orderRepository,
                                        PointHistoryRepository pointHistoryRepository,
                                        JdbcTemplate jdbcTemplate) {
            this.orderRepository = orderRepository;
            this.pointHistoryRepository = pointHistoryRepository;
            this.jdbcTemplate = jdbcTemplate;
        }

        @GetMapping("/customers/{id}/orders")
        public ApiResponse<?> customerOrders(@PathVariable Long id) {
            return ApiResponse.success(orderRepository.findAll().stream()
                    .filter(item -> id.equals(item.getCustomerId()))
                    .toList());
        }

        @GetMapping("/customers/{id}/point-history")
        public ApiResponse<?> customerPointHistory(@PathVariable Long id) {
            return ApiResponse.success(pointHistoryRepository.findAll().stream()
                    .filter(item -> id.equals(item.getCustomerId()))
                    .toList());
        }

        @PutMapping("/roles/{id}/permissions")
        public ApiResponse<?> updateRolePermissions(@PathVariable Long id, @RequestBody Map<String, List<String>> request) {
            List<String> permissions = request.getOrDefault("permissions", List.of());
            jdbcTemplate.update("DELETE FROM role_permission WHERE role_id = ?", id);
            permissions.forEach(permission -> jdbcTemplate.update(
                    "INSERT INTO role_permission(role_id, permission_code) VALUES (?, ?)",
                    id,
                    permission
            ));
            return ApiResponse.success(Map.of("roleId", id, "permissions", permissions));
        }
    }
