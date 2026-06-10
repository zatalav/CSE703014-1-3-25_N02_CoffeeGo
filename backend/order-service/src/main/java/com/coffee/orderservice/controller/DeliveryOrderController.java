package com.coffee.orderservice.controller;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.ApiResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.orderservice.entity.Customer;
import com.coffee.orderservice.entity.CustomerDetail;
import com.coffee.orderservice.entity.OrderDetail;
import com.coffee.orderservice.entity.OrderEntity;
import com.coffee.orderservice.entity.Payment;
import com.coffee.orderservice.entity.Product;
import com.coffee.orderservice.repository.CustomerDetailRepository;
import com.coffee.orderservice.repository.CustomerRepository;
import com.coffee.orderservice.repository.OrderDetailRepository;
import com.coffee.orderservice.repository.OrderEntityRepository;
import com.coffee.orderservice.repository.PaymentRepository;
import com.coffee.orderservice.repository.ProductRepository;
import com.coffee.orderservice.service.CustomerRewardService;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/delivery")
@PreAuthorize("hasAnyRole('admin','branch_manager','delivery_staff')")
public class DeliveryOrderController {
    private static final Set<String> VISIBLE_STATUSES = Set.of("confirmed", "ready", "delivering", "completed", "cancelled");

    private final OrderEntityRepository orderRepository;
    private final OrderDetailRepository detailRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final CustomerDetailRepository customerDetailRepository;
    private final CustomerRewardService rewardService;

    public DeliveryOrderController(OrderEntityRepository orderRepository,
                                   OrderDetailRepository detailRepository,
                                   PaymentRepository paymentRepository,
                                   ProductRepository productRepository,
                                   CustomerRepository customerRepository,
                                   CustomerDetailRepository customerDetailRepository,
                                   CustomerRewardService rewardService) {
        this.orderRepository = orderRepository;
        this.detailRepository = detailRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.customerDetailRepository = customerDetailRepository;
        this.rewardService = rewardService;
    }

    @GetMapping
    public ApiResponse<List<DeliveryOrderResponse>> list(@AuthenticationPrincipal AuthenticatedUser user) {
        Long branchId = user == null ? null : user.getBranchId();
        List<DeliveryOrderResponse> orders = orderRepository.findAll().stream()
                .filter(this::isDeliveryOrder)
                .filter(order -> branchId == null || Objects.equals(branchId, order.getBranchId()))
                .filter(order -> VISIBLE_STATUSES.contains(normalize(order.getStatus())))
                .sorted(Comparator.comparing(OrderEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toResponse)
                .toList();
        return ApiResponse.success(orders);
    }

    @PatchMapping("/{id}/accept")
    @Transactional
    public ApiResponse<DeliveryOrderResponse> accept(@PathVariable Long id,
                                                     @AuthenticationPrincipal AuthenticatedUser user) {
        OrderEntity order = findDeliveryOrder(id, user);
        String status = normalize(order.getStatus());
        if (!"confirmed".equals(status) && !"ready".equals(status)) {
            throw new BadRequestException("Only confirmed delivery orders can be accepted");
        }
        order.setOrderType("delivery");
        order.setEmployeeId(user.getUserId());
        order.setStatus("delivering");
        order.setUpdatedAt(LocalDateTime.now());
        return ApiResponse.success(toResponse(orderRepository.save(order)));
    }

    @PatchMapping("/{id}/complete")
    @Transactional
    public ApiResponse<DeliveryOrderResponse> complete(@PathVariable Long id,
                                                       @AuthenticationPrincipal AuthenticatedUser user) {
        OrderEntity order = findDeliveryOrder(id, user);
        if (!Objects.equals(user.getUserId(), order.getEmployeeId())) {
            throw new BadRequestException("This delivery order is assigned to another employee");
        }
        if (!"delivering".equals(normalize(order.getStatus()))) {
            throw new BadRequestException("Only delivering orders can be completed");
        }
        order.setStatus("completed");
        order.setUpdatedAt(LocalDateTime.now());
        order = orderRepository.save(order);
        rewardService.awardIfCompleted(order);
        return ApiResponse.success(toResponse(order));
    }

    private OrderEntity findDeliveryOrder(Long id, AuthenticatedUser user) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Order not found"));
        if (!isDeliveryOrder(order)) {
            throw new BadRequestException("Order is not a delivery order");
        }
        if (user != null && user.getBranchId() != null && !Objects.equals(user.getBranchId(), order.getBranchId())) {
            throw new BadRequestException("Order belongs to another branch");
        }
        return order;
    }

    private boolean isDeliveryOrder(OrderEntity order) {
        String status = normalize(order.getStatus());
        return "delivery".equals(normalize(order.getOrderType()))
                || "confirmed".equals(status)
                || "ready".equals(status);
    }

    private DeliveryOrderResponse toResponse(OrderEntity order) {
        DeliveryOrderResponse response = new DeliveryOrderResponse();
        response.id = String.valueOf(order.getOrderId());
        response.orderId = order.getOrderId();
        response.orderNumber = String.format("%03d", order.getOrderId());
        response.branchId = order.getBranchId();
        response.employeeId = order.getEmployeeId();
        response.status = normalize(order.getStatus());
        response.note = order.getNote();
        response.customerName = extractNoteValue(order.getNote(), "khach hang");
        response.customerPhone = extractNoteValue(order.getNote(), "so dien thoai", "sdt", "phone");
        response.address = extractDeliveryAddress(order.getNote());
        response.addressLabel = extractNoteValue(order.getNote(), "nhan dia chi");
        response.ward = extractNoteValue(order.getNote(), "phuong xa");
        response.district = extractNoteValue(order.getNote(), "quan huyen");
        response.province = extractNoteValue(order.getNote(), "tinh thanh");
        response.shippingFee = extractLongNoteValue(order.getNote(), "phi giao hang");
        response.deliveryDistanceKm = extractDoubleNoteValue(order.getNote(), "khoang cach giao hang");
        response.driverCommissionRate = extractDoubleNoteValue(order.getNote(), "ty le shipper");
        response.driverCommission = extractLongNoteValue(order.getNote(), "thu nhap shipper");
        response.createdAt = order.getCreatedAt();
        response.updatedAt = order.getUpdatedAt();

        if (order.getCustomerId() != null) {
            customerRepository.findById(order.getCustomerId()).map(Customer::getName).ifPresent(name -> {
                if (response.customerName.isBlank()) response.customerName = name;
            });
            customerDetailRepository.findById(order.getCustomerId()).ifPresent(detail -> {
                if (response.customerPhone.isBlank() && detail.getPhoneNumber() != null) {
                    response.customerPhone = detail.getPhoneNumber();
                }
                if (response.address.isBlank() && detail.getAddress() != null) {
                    response.address = detail.getAddress();
                }
            });
        }

        List<OrderDetail> details = detailRepository.findAll().stream()
                .filter(detail -> Objects.equals(order.getOrderId(), detail.getOrderId()))
                .toList();
        for (OrderDetail detail : details) {
            DeliveryOrderItem item = new DeliveryOrderItem();
            item.name = detail.getProductId() == null
                    ? "Item"
                    : productRepository.findById(detail.getProductId()).map(Product::getProductName).orElse("Product #" + detail.getProductId());
            item.quantity = detail.getQuantity() == null ? 0 : detail.getQuantity();
            item.unitPrice = detail.getUnitPrice() == null ? 0L : detail.getUnitPrice();
            response.total += item.unitPrice * item.quantity;
            response.items.add(item);
        }

        Payment payment = paymentRepository.findByOrderId(order.getOrderId()).orElse(null);
        if (payment != null) {
            response.paymentMethod = payment.getMethod();
            response.total = payment.getAmount() == null ? response.total : payment.getAmount();
        }
        return response;
    }

    private String extractDeliveryAddress(String note) {
        if (note == null || note.isBlank()) return "";
        return extractNoteValue(note, "giao den", "dia chi giao", "address");
    }

    private String extractNoteValue(String note, String... keys) {
        if (note == null || note.isBlank()) return "";
        String[] lines = note.split("\\R");
        for (String line : lines) {
            String normalizedLine = removeVietnameseMarks(line).toLowerCase(Locale.ROOT).trim();
            for (String key : keys) {
                String marker = removeVietnameseMarks(key).toLowerCase(Locale.ROOT).trim() + ":";
                if (normalizedLine.startsWith(marker)) {
                    int colonIndex = line.indexOf(':');
                    return colonIndex >= 0 ? line.substring(colonIndex + 1).trim() : "";
                }
            }
        }
        return "";
    }

    private Long extractLongNoteValue(String note, String key) {
        String value = extractNoteValue(note, key);
        if (value == null || value.isBlank()) return null;
        String numeric = value.replaceAll("[^0-9-]", "");
        if (numeric.isBlank()) return null;
        try {
            return Long.valueOf(numeric);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Double extractDoubleNoteValue(String note, String key) {
        String value = extractNoteValue(note, key);
        if (value == null || value.isBlank()) return null;
        String numeric = value.replace(',', '.').replaceAll("[^0-9.-]", "");
        if (numeric.isBlank()) return null;
        try {
            return Double.valueOf(numeric);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String removeVietnameseMarks(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    public static class DeliveryOrderResponse {
        public String id;
        public Long orderId;
        public String orderNumber;
        public Long branchId;
        public Long employeeId;
        public String status;
        public String note;
        public String address = "";
        public String addressLabel = "";
        public String ward = "";
        public String district = "";
        public String province = "";
        public String customerName = "";
        public String customerPhone = "";
        public String paymentMethod = "";
        public Long shippingFee;
        public Double deliveryDistanceKm;
        public Double driverCommissionRate;
        public Long driverCommission;
        public Long total = 0L;
        public LocalDateTime createdAt;
        public LocalDateTime updatedAt;
        public List<DeliveryOrderItem> items = new ArrayList<>();
    }

    public static class DeliveryOrderItem {
        public String name;
        public Integer quantity;
        public Long unitPrice;
    }
}
