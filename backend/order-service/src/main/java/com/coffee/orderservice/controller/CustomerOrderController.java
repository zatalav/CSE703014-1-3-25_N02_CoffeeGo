package com.coffee.orderservice.controller;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.ApiResponse;
import com.coffee.orderservice.entity.Combo;
import com.coffee.orderservice.entity.OrderDetail;
import com.coffee.orderservice.entity.OrderEntity;
import com.coffee.orderservice.entity.Payment;
import com.coffee.orderservice.entity.Product;
import com.coffee.orderservice.entity.ProductSize;
import com.coffee.orderservice.entity.Customer;
import com.coffee.orderservice.entity.CustomerDetail;
import com.coffee.orderservice.repository.CouponRepository;
import com.coffee.orderservice.repository.ComboRepository;
import com.coffee.orderservice.repository.CustomerDetailRepository;
import com.coffee.orderservice.repository.CustomerRepository;
import com.coffee.orderservice.repository.OrderDetailRepository;
import com.coffee.orderservice.repository.OrderEntityRepository;
import com.coffee.orderservice.repository.PaymentRepository;
import com.coffee.orderservice.repository.ProductRepository;
import com.coffee.orderservice.repository.ProductSizeRepository;
import com.coffee.orderservice.service.CustomerRewardService;
import com.coffee.common.security.AuthenticatedUser;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/customer")
public class CustomerOrderController {
    private final OrderEntityRepository orderRepository;
    private final OrderDetailRepository detailRepository;
    private final PaymentRepository paymentRepository;
    private final CouponRepository couponRepository;
    private final ComboRepository comboRepository;
    private final ProductRepository productRepository;
    private final ProductSizeRepository sizeRepository;
    private final CustomerRepository customerRepository;
    private final CustomerDetailRepository customerDetailRepository;
    private final JdbcTemplate jdbcTemplate;
    private final CustomerRewardService rewardService;

    public CustomerOrderController(OrderEntityRepository orderRepository,
                                   OrderDetailRepository detailRepository,
                                   PaymentRepository paymentRepository,
                                   CouponRepository couponRepository,
                                   ComboRepository comboRepository,
                                   ProductRepository productRepository,
                                   ProductSizeRepository sizeRepository,
                                   CustomerRepository customerRepository,
                                   CustomerDetailRepository customerDetailRepository,
                                   JdbcTemplate jdbcTemplate,
                                   CustomerRewardService rewardService) {
        this.orderRepository = orderRepository;
        this.detailRepository = detailRepository;
        this.paymentRepository = paymentRepository;
        this.couponRepository = couponRepository;
        this.comboRepository = comboRepository;
        this.productRepository = productRepository;
        this.sizeRepository = sizeRepository;
        this.customerRepository = customerRepository;
        this.customerDetailRepository = customerDetailRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.rewardService = rewardService;
    }

    @GetMapping
    public ApiResponse<List<CustomerOrderResponse>> list(@RequestParam(required = false) Long customerId,
                                                         @AuthenticationPrincipal AuthenticatedUser user) {
        Long effectiveCustomerId = resolveCustomerId(customerId, user);
        List<CustomerOrderResponse> orders = orderRepository.findAll().stream()
                .filter(order -> Objects.equals(effectiveCustomerId, order.getCustomerId()))
                .sorted(Comparator.comparing(OrderEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toResponse)
                .toList();
        return ApiResponse.success(orders);
    }

    @GetMapping("/{id}")
    public ApiResponse<CustomerOrderResponse> get(@PathVariable Long id,
                                                  @RequestParam(required = false) Long customerId,
                                                  @AuthenticationPrincipal AuthenticatedUser user) {
        Long effectiveCustomerId = resolveCustomerId(customerId, user);
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Order not found"));
        if (!Objects.equals(effectiveCustomerId, order.getCustomerId())) {
            throw new BadRequestException("Order does not belong to this customer");
        }
        return ApiResponse.success(toResponse(order));
    }

    @PostMapping
    @Transactional
    public ApiResponse<CustomerOrderResponse> create(@RequestBody CustomerOrderRequest request,
                                                     @AuthenticationPrincipal AuthenticatedUser user) {
        if (request == null || request.branchId == null) {
            throw new BadRequestException("branchId is required");
        }
        request.customerId = resolveCustomerId(request.customerId, user);
        if (request.items == null || request.items.isEmpty()) {
            throw new BadRequestException("Order must contain at least one item");
        }

        LocalDateTime now = LocalDateTime.now();
        OrderEntity order = new OrderEntity();
        order.setCustomerId(request.customerId);
        order.setBranchId(request.branchId);
        order.setEmployeeId(resolveEmployeeId(request.employeeId, request.branchId));
        order.setCouponId(request.couponId);
        order.setOrderType(normalizeOrderType(request.orderType));
        order.setStatus("pending");
        order.setNote(buildOrderNote(request));
        order.setCreatedAt(now);
        order.setUpdatedAt(now);
        order = orderRepository.save(order);

        long subtotal = 0L;
        for (CustomerOrderItemRequest item : request.items) {
            if (item.quantity == null || item.quantity <= 0) {
                throw new BadRequestException("Item quantity must be greater than 0");
            }
            Long productId = item.productId == null && item.comboId != null ? null : resolveProductId(item);
            if (item.comboId != null) {
                assertComboOrderable(item.comboId);
            }
            Long sizeId = productId == null ? null : resolveSizeId(productId, item);
            Long unitPrice = item.unitPrice == null ? defaultUnitPrice(productId, item.comboId) : item.unitPrice;
            OrderDetail detail = new OrderDetail();
            detail.setOrderId(order.getOrderId());
            detail.setProductId(productId);
            detail.setComboId(item.comboId);
            detail.setQuantity(item.quantity);
            detail.setUnitPrice(unitPrice);
            detail.setSizeId(sizeId);
            detail.setNote(item.note);
            detailRepository.save(detail);
            subtotal += unitPrice * item.quantity;
        }

        long discount = request.discount == null ? 0L : Math.max(0L, request.discount);
        if (request.couponId != null) {
            couponRepository.findById(request.couponId).ifPresent(coupon -> {
                coupon.setUsedCount((coupon.getUsedCount() == null ? 0 : coupon.getUsedCount()) + 1);
                couponRepository.save(coupon);
            });
        }

        Payment payment = new Payment();
        payment.setOrderId(order.getOrderId());
        payment.setMethod(normalizePaymentMethod(request.paymentMethod, request.paymentProvider));
        payment.setProvider(request.paymentProvider);
        payment.setAmount(request.amount == null ? Math.max(0L, subtotal - discount) : request.amount);
        payment.setDiscount(discount);
        payment.setDripsUsed(request.dripsUsed);
        payment.setStatus(blankToDefault(request.paymentStatus, "paid"));
        if ("paid".equalsIgnoreCase(payment.getStatus())) {
            payment.setPaidAt(now);
        }
        paymentRepository.save(payment);

        return ApiResponse.success("Created", toResponse(order));
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalizePaymentMethod(String method, String provider) {
        String normalizedMethod = normalize(method);
        String normalizedProvider = normalize(provider);
        if (normalizedMethod.isBlank()) return "cash";
        if ("cash".equals(normalizedMethod) || "e_wallet".equals(normalizedMethod)) {
            return normalizedMethod;
        }
        if ("qr".equals(normalizedMethod) || "points".equals(normalizedMethod)) {
            return "e_wallet";
        }
        if ("vietqr".equals(normalizedMethod)
                || "vnpay".equals(normalizedMethod)
                || "momo".equals(normalizedMethod)
                || "zalopay".equals(normalizedMethod)
                || "vietqr".equals(normalizedProvider)
                || "vnpay".equals(normalizedProvider)
                || "momo".equals(normalizedProvider)
                || "zalopay".equals(normalizedProvider)) {
            return "e_wallet";
        }
        return "cash";
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private Long resolveCustomerId(Long requestCustomerId, AuthenticatedUser user) {
        Long customerId = null;
        if (user != null && user.getUserId() != null && isCustomerRole(user.getRoleName())) {
            customerId = user.getUserId();
        } else if (requestCustomerId != null) {
            customerId = requestCustomerId;
        }
        if (customerId == null) {
            throw new BadRequestException("Customer login is required");
        }
        if (!customerRepository.existsById(customerId)) {
            throw new BadRequestException("Customer not found");
        }
        return customerId;
    }

    private boolean isCustomerRole(String roleName) {
        String normalized = normalizeText(roleName).replace('_', ' ');
        return "customer".equals(normalized)
                || normalized.contains("khach hang")
                || normalized.contains("customer");
    }

    private Long resolveProductId(CustomerOrderItemRequest item) {
        if (item.productId != null) {
            Product product = productRepository.findById(item.productId)
                    .orElseThrow(() -> new BadRequestException("Product not found: " + item.productId));
            if (!isActive(product.getStatus())) {
                throw new BadRequestException("Product is inactive: " + product.getProductName());
            }
            return product.getProductId();
        }

        String requestedName = firstNonBlank(item.productName, item.name);
        if (requestedName == null) {
            throw new BadRequestException("productId or productName is required");
        }
        String normalizedName = normalizeText(requestedName);
        return productRepository.findAll().stream()
                .filter(product -> isActive(product.getStatus()))
                .filter(product -> normalizeText(product.getProductName()).equals(normalizedName))
                .map(Product::getProductId)
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Product not found: " + requestedName));
    }

    private Long resolveSizeId(Long productId, CustomerOrderItemRequest item) {
        if (item.sizeId != null) {
            ProductSize size = sizeRepository.findById(item.sizeId)
                    .orElseThrow(() -> new BadRequestException("Product size not found: " + item.sizeId));
            if (!Objects.equals(productId, size.getProductId())) {
                throw new BadRequestException("Product size does not belong to product");
            }
            if (!isActive(size.getStatus())) {
                throw new BadRequestException("Product size is inactive: " + size.getSize());
            }
            return size.getSizeId();
        }

        String requestedSize = firstNonBlank(item.size, item.sizeName);
        if (requestedSize == null || requestedSize.isBlank()) {
            return null;
        }
        String normalizedSize = normalizeText(requestedSize);
        return sizeRepository.findAll().stream()
                .filter(size -> Objects.equals(productId, size.getProductId()))
                .filter(size -> isActive(size.getStatus()))
                .filter(size -> normalizeText(size.getSize()).equals(normalizedSize))
                .map(ProductSize::getSizeId)
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Product size not found: " + requestedSize));
    }

    private void assertComboOrderable(Long comboId) {
        Combo combo = comboRepository.findById(comboId)
                .orElseThrow(() -> new BadRequestException("Combo not found: " + comboId));
        if (!isActive(combo.getStatus())) {
            throw new BadRequestException("Combo is inactive: " + combo.getComboName());
        }
        LocalDate today = LocalDate.now();
        if (combo.getStartDate() != null && combo.getStartDate().isAfter(today)) {
            throw new BadRequestException("Combo is not available yet: " + combo.getComboName());
        }
        if (combo.getEndDate() != null && combo.getEndDate().isBefore(today)) {
            throw new BadRequestException("Combo has expired: " + combo.getComboName());
        }
    }

    private Long defaultUnitPrice(Long productId, Long comboId) {
        if (productId != null) {
            return productRepository.findById(productId).map(Product::getBasePrice).orElse(0L);
        }
        if (comboId != null) {
            return comboRepository.findById(comboId).map(Combo::getPrice).orElse(0L);
        }
        return 0L;
    }

    private boolean isActive(String status) {
        String normalized = normalize(status);
        return normalized.isBlank() || "active".equals(normalized);
    }

    private CustomerOrderResponse toResponse(OrderEntity order) {
        CustomerOrderResponse response = new CustomerOrderResponse();
        response.id = String.valueOf(order.getOrderId());
        response.orderId = order.getOrderId();
        response.orderNumber = String.format("%03d", order.getOrderId());
        response.customerId = order.getCustomerId();
        response.employeeId = order.getEmployeeId();
        response.branchId = order.getBranchId();
        response.status = normalize(order.getStatus()).isBlank() ? "pending" : normalize(order.getStatus());
        response.orderType = normalize(order.getOrderType()).isBlank() ? "dine-in" : normalize(order.getOrderType());
        response.note = order.getNote();
        response.createdAt = order.getCreatedAt();
        response.updatedAt = order.getUpdatedAt();

        if (order.getCustomerId() != null) {
            customerRepository.findById(order.getCustomerId())
                    .map(Customer::getName)
                    .ifPresent(name -> response.customerName = name);
            customerDetailRepository.findById(order.getCustomerId()).ifPresent(detail -> {
                response.customerPhone = detail.getPhoneNumber();
                response.customerEmail = detail.getEmail();
                response.deliveryAddress = detail.getAddress();
            });
        }
        response.customerName = firstNonBlank(extractNoteValue(order.getNote(), "Khach hang"), response.customerName);
        response.customerPhone = firstNonBlank(extractNoteValue(order.getNote(), "So dien thoai"), response.customerPhone);
        response.customerEmail = firstNonBlank(extractNoteValue(order.getNote(), "Email"), response.customerEmail);
        response.deliveryAddress = firstNonBlank(extractNoteValue(order.getNote(), "Giao den"), response.deliveryAddress);
        response.deliveryAddressLabel = firstNonBlank(extractNoteValue(order.getNote(), "Nhan dia chi"), "");
        response.deliveryWard = firstNonBlank(extractNoteValue(order.getNote(), "Phuong xa"), "");
        response.deliveryDistrict = firstNonBlank(extractNoteValue(order.getNote(), "Quan huyen"), "");
        response.deliveryProvince = firstNonBlank(extractNoteValue(order.getNote(), "Tinh thanh"), "");
        response.shippingFee = extractLongNoteValue(order.getNote(), "Phi giao hang");
        response.deliveryDistanceKm = extractDoubleNoteValue(order.getNote(), "Khoang cach giao hang");
        response.driverCommissionRate = extractDoubleNoteValue(order.getNote(), "Ty le shipper");
        response.driverCommission = extractLongNoteValue(order.getNote(), "Thu nhap shipper");

        List<OrderDetail> details = detailRepository.findAll().stream()
                .filter(detail -> Objects.equals(order.getOrderId(), detail.getOrderId()))
                .toList();
        long total = 0L;
        response.items = new ArrayList<>();
        for (OrderDetail detail : details) {
            CustomerOrderItemResponse item = new CustomerOrderItemResponse();
            item.orderDetailId = detail.getOrderDetailId();
            item.productId = detail.getProductId();
            item.comboId = detail.getComboId();
            item.name = resolveItemName(detail);
            item.qty = detail.getQuantity() == null ? 0 : detail.getQuantity();
            item.quantity = item.qty;
            item.unitPrice = detail.getUnitPrice() == null ? 0L : detail.getUnitPrice();
            item.price = item.unitPrice;
            item.note = detail.getNote();
            item.sizeId = detail.getSizeId();
            item.size = detail.getSizeId() == null
                    ? ""
                    : sizeRepository.findById(detail.getSizeId()).map(ProductSize::getSize).orElse("");
            total += item.unitPrice * item.qty;
            response.items.add(item);
        }

        response.total = total;
        Payment payment = paymentRepository.findByOrderId(order.getOrderId()).orElse(null);
        if (payment != null) {
            response.paymentMethod = payment.getMethod();
            response.paymentProvider = payment.getProvider();
            response.paymentStatus = payment.getStatus();
            response.paidAt = payment.getPaidAt();
            response.discount = payment.getDiscount() == null ? 0L : payment.getDiscount();
            response.dripsUsed = payment.getDripsUsed();
            response.amount = payment.getAmount();
        } else {
            response.discount = 0L;
            response.amount = total;
        }
        response.loyalty = rewardService.loyaltySummary(order.getCustomerId());
        return response;
    }

    private String resolveItemName(OrderDetail detail) {
        if (detail.getProductId() != null) {
            return productRepository.findById(detail.getProductId())
                    .map(Product::getProductName)
                    .orElse("Product #" + detail.getProductId());
        }
        if (detail.getComboId() != null) {
            return comboRepository.findById(detail.getComboId())
                    .map(Combo::getComboName)
                    .orElse("Combo #" + detail.getComboId());
        }
        return "Item";
    }

    private String extractNoteValue(String note, String label) {
        if (note == null || note.isBlank() || label == null || label.isBlank()) {
            return null;
        }
        String normalizedLabel = normalizeText(label);
        for (String line : note.split("\\R")) {
            int separator = line.indexOf(':');
            if (separator <= 0) continue;
            String currentLabel = normalizeText(line.substring(0, separator));
            if (normalizedLabel.equals(currentLabel)) {
                String value = line.substring(separator + 1).trim();
                return value.isBlank() ? null : value;
            }
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String normalizeText(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private String normalizeOrderType(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        if ("delivery".equals(normalized) || "giao hang".equals(normalized) || "giao hàng".equals(normalized)) {
            return "delivery";
        }
        return "dine-in";
    }

    private String buildOrderNote(CustomerOrderRequest request) {
        StringBuilder note = new StringBuilder();
        appendNoteLine(note, "Khach hang", request.customerName);
        appendNoteLine(note, "So dien thoai", request.customerPhone);
        appendNoteLine(note, "Email", request.customerEmail);
        appendNoteLine(note, "Giao den", request.deliveryAddress);
        appendNoteLine(note, "Nhan dia chi", request.deliveryAddressLabel);
        appendNoteLine(note, "Phuong xa", request.deliveryWard);
        appendNoteLine(note, "Quan huyen", firstNonBlank(request.deliveryDistrict, request.district));
        appendNoteLine(note, "Tinh thanh", request.deliveryProvince);
        appendNoteLine(note, "Cua hang", firstNonBlank(request.pickupStore, request.storeName));
        appendNoteLine(note, "Thanh toan", request.paymentProvider);
        appendNoteLine(note, "Phi giao hang", request.shippingFee == null ? null : String.valueOf(Math.max(0L, request.shippingFee)));
        appendNoteLine(note, "Khoang cach giao hang", request.deliveryDistanceKm == null ? null : String.valueOf(Math.max(0D, request.deliveryDistanceKm)));
        appendNoteLine(note, "Ty le shipper", request.driverCommissionRate == null ? null : String.valueOf(Math.max(0D, request.driverCommissionRate)));
        appendNoteLine(note, "Thu nhap shipper", request.driverCommission == null ? null : String.valueOf(Math.max(0L, request.driverCommission)));
        if (request.note != null && !request.note.isBlank()) {
            if (!note.isEmpty()) note.append('\n');
            note.append(request.note.trim());
        }
        return note.isEmpty() ? null : note.toString();
    }

    private void appendNoteLine(StringBuilder note, String label, String value) {
        if (value == null || value.isBlank()) return;
        if (!note.isEmpty()) note.append('\n');
        note.append(label).append(": ").append(value.trim());
    }

    private Long extractLongNoteValue(String note, String label) {
        String value = extractNoteValue(note, label);
        if (value == null || value.isBlank()) return null;
        String numeric = value.replaceAll("[^0-9-]", "");
        if (numeric.isBlank()) return null;
        try {
            return Long.valueOf(numeric);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Double extractDoubleNoteValue(String note, String label) {
        String value = extractNoteValue(note, label);
        if (value == null || value.isBlank()) return null;
        String numeric = value.replace(',', '.').replaceAll("[^0-9.-]", "");
        if (numeric.isBlank()) return null;
        try {
            return Double.valueOf(numeric);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long resolveEmployeeId(Long requestedEmployeeId, Long branchId) {
        if (requestedEmployeeId != null && employeeBelongsToBranch(requestedEmployeeId, branchId)) {
            return requestedEmployeeId;
        }

        List<Long> branchStaffIds = jdbcTemplate.queryForList(
                """
                SELECT e.id
                FROM Employee e
                LEFT JOIN Role r ON r.role_id = e.role_id
                WHERE e.branch_id = ?
                  AND (e.status IS NULL OR LOWER(e.status) = 'active')
                  AND (
                    LOWER(COALESCE(r.role_name, '')) IN ('branch staff', 'sales staff')
                    OR LOWER(COALESCE(r.role_group, '')) = 'employee'
                  )
                ORDER BY e.id
                LIMIT 1
                """,
                Long.class,
                branchId
        );
        if (!branchStaffIds.isEmpty()) {
            return branchStaffIds.get(0);
        }

        List<Long> branchEmployeeIds = jdbcTemplate.queryForList(
                """
                SELECT e.id
                FROM Employee e
                WHERE e.branch_id = ?
                  AND (e.status IS NULL OR LOWER(e.status) = 'active')
                ORDER BY e.id
                LIMIT 1
                """,
                Long.class,
                branchId
        );
        if (!branchEmployeeIds.isEmpty()) {
            return branchEmployeeIds.get(0);
        }

        List<Long> anyBranchEmployeeIds = jdbcTemplate.queryForList(
                """
                SELECT e.id
                FROM Employee e
                WHERE e.branch_id = ?
                ORDER BY e.id
                LIMIT 1
                """,
                Long.class,
                branchId
        );
        if (!anyBranchEmployeeIds.isEmpty()) {
            return anyBranchEmployeeIds.get(0);
        }

        throw new BadRequestException("Branch has no active employee to receive orders");
    }

    private boolean employeeBelongsToBranch(Long employeeId, Long branchId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM Employee WHERE id = ? AND branch_id = ?",
                Integer.class,
                employeeId,
                branchId
        );
        return count != null && count > 0;
    }

    public static class CustomerOrderRequest {
        public Long customerId;
        public Long employeeId;
        public Long branchId;
        public Long couponId;
        public String orderType;
        public String note;
        public String paymentMethod;
        public String paymentProvider;
        public String paymentStatus;
        public String customerName;
        public String customerPhone;
        public String customerEmail;
        public String deliveryAddress;
        public String deliveryAddressLabel;
        public String deliveryWard;
        public String deliveryProvince;
        public String deliveryDistrict;
        public String district;
        public String pickupStore;
        public String storeName;
        public Long shippingFee;
        public Double deliveryDistanceKm;
        public Double driverCommissionRate;
        public Long driverCommission;
        public Long amount;
        public Long discount;
        public Integer dripsUsed;
        public List<CustomerOrderItemRequest> items;
    }

    public static class CustomerOrderItemRequest {
        public Long productId;
        public Long comboId;
        public Integer quantity;
        public Long unitPrice;
        public Long sizeId;
        public String productName;
        public String name;
        public String size;
        public String sizeName;
        public String note;
    }

    public static class CustomerOrderResponse {
        public String id;
        public Long orderId;
        public String orderNumber;
        public Long customerId;
        public Long employeeId;
        public Long branchId;
        public String status;
        public String orderType;
        public String note;
        public LocalDateTime createdAt;
        public LocalDateTime updatedAt;
        public String paymentMethod;
        public String paymentProvider;
        public String paymentStatus;
        public LocalDateTime paidAt;
        public Long amount;
        public Long discount = 0L;
        public Integer dripsUsed;
        public Long total = 0L;
        public String customerName = "";
        public String customerPhone = "";
        public String customerEmail = "";
        public String deliveryAddress = "";
        public String deliveryAddressLabel = "";
        public String deliveryWard = "";
        public String deliveryDistrict = "";
        public String deliveryProvince = "";
        public Long shippingFee;
        public Double deliveryDistanceKm;
        public Double driverCommissionRate;
        public Long driverCommission;
        public List<CustomerOrderItemResponse> items = new ArrayList<>();
        public CustomerRewardService.LoyaltySummary loyalty;
    }

    public static class CustomerOrderItemResponse {
        public Long orderDetailId;
        public Long productId;
        public Long comboId;
        public String name;
        public Integer qty;
        public Integer quantity;
        public String size;
        public Long sizeId;
        public String note;
        public Long unitPrice;
        public Long price;
    }
}
