package com.coffee.orderservice.controller;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.ApiResponse;
import com.coffee.common.response.PageResponse;
import com.coffee.common.security.AuthenticatedUser;
import com.coffee.orderservice.entity.Coupon;
import com.coffee.orderservice.entity.Customer;
import com.coffee.orderservice.entity.CustomerDetail;
import com.coffee.orderservice.entity.Ingredient;
import com.coffee.orderservice.entity.OrderDetail;
import com.coffee.orderservice.entity.OrderDetailTopping;
import com.coffee.orderservice.entity.OrderEntity;
import com.coffee.orderservice.entity.Payment;
import com.coffee.orderservice.entity.Product;
import com.coffee.orderservice.entity.ProductSize;
import com.coffee.orderservice.repository.CouponRepository;
import com.coffee.orderservice.repository.CustomerDetailRepository;
import com.coffee.orderservice.repository.CustomerRepository;
import com.coffee.orderservice.repository.IngredientRepository;
import com.coffee.orderservice.repository.OrderDetailRepository;
import com.coffee.orderservice.repository.OrderDetailToppingRepository;
import com.coffee.orderservice.repository.OrderEntityRepository;
import com.coffee.orderservice.repository.PaymentRepository;
import com.coffee.orderservice.repository.ProductRepository;
import com.coffee.orderservice.repository.ProductSizeRepository;
import com.coffee.orderservice.service.CustomerRewardService;
import jakarta.persistence.criteria.Predicate;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/orders")
@PreAuthorize("hasAnyRole('admin','branch_manager','sales_staff','sale_staff')")
public class StaffOrderController {
    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "pending", "confirmed", "preparing", "ready", "delivering", "completed", "cancelled"
    );

    private final OrderEntityRepository orderRepository;
    private final OrderDetailRepository detailRepository;
    private final OrderDetailToppingRepository toppingRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final ProductSizeRepository sizeRepository;
    private final IngredientRepository ingredientRepository;
    private final CustomerRepository customerRepository;
    private final CustomerDetailRepository customerDetailRepository;
    private final CouponRepository couponRepository;
    private final CustomerRewardService rewardService;

    public StaffOrderController(OrderEntityRepository orderRepository,
                                OrderDetailRepository detailRepository,
                                OrderDetailToppingRepository toppingRepository,
                                PaymentRepository paymentRepository,
                                ProductRepository productRepository,
                                ProductSizeRepository sizeRepository,
                                IngredientRepository ingredientRepository,
                                CustomerRepository customerRepository,
                                CustomerDetailRepository customerDetailRepository,
                                CouponRepository couponRepository,
                                CustomerRewardService rewardService) {
        this.orderRepository = orderRepository;
        this.detailRepository = detailRepository;
        this.toppingRepository = toppingRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.sizeRepository = sizeRepository;
        this.ingredientRepository = ingredientRepository;
        this.customerRepository = customerRepository;
        this.customerDetailRepository = customerDetailRepository;
        this.couponRepository = couponRepository;
        this.rewardService = rewardService;
    }

    @GetMapping
    public ApiResponse<?> list(@RequestParam(required = false) Long branchId,
                               @RequestParam(required = false) Long employeeId,
                               @RequestParam(required = false) String status,
                               @RequestParam(required = false) Integer page,
                               @RequestParam(defaultValue = "100") Integer size,
                               @AuthenticationPrincipal AuthenticatedUser user) {
        Long scopedBranchId = scopedBranchId(user);
        final Long effectiveBranchId = scopedBranchId == null ? branchId : scopedBranchId;
        String statusFilter = normalize(status);
        int max = Math.max(1, Math.min(size == null ? 100 : size, 500));

        Specification<OrderEntity> specification = orderSpecification(effectiveBranchId, employeeId, statusFilter);
        Sort sort = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("orderId"));

        if (page != null) {
            int pageNumber = Math.max(0, page);
            Page<OrderEntity> orderPage = orderRepository.findAll(specification, PageRequest.of(pageNumber, max, sort));
            List<StaffOrderResponse> items = orderPage.getContent().stream()
                    .map(this::toResponse)
                    .toList();
            return ApiResponse.success(new PageResponse<>(
                    items,
                    orderPage.getNumber(),
                    orderPage.getSize(),
                    orderPage.getTotalElements(),
                    orderPage.getTotalPages()
            ));
        }

        List<StaffOrderResponse> orders = orderRepository.findAll(specification, PageRequest.of(0, max, sort)).getContent().stream()
                .map(this::toResponse)
                .toList();
        return ApiResponse.success(orders);
    }

    @GetMapping("/coupons/validate")
    public ApiResponse<CouponValidationResponse> validateCoupon(@RequestParam String code,
                                                                @RequestParam(defaultValue = "0") Long total) {
        Coupon coupon = couponRepository.findByCode(code.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new BadRequestException("Coupon not found"));
        long discount = calculateDiscount(coupon, total == null ? 0L : total);
        CouponValidationResponse response = new CouponValidationResponse();
        response.couponId = coupon.getCouponId();
        response.code = coupon.getCode();
        response.discount = discount;
        response.discountType = coupon.getDiscountType();
        response.discountValue = coupon.getDiscountValue();
        return ApiResponse.success(response);
    }

    @PostMapping
    @Transactional
    public ApiResponse<StaffOrderResponse> create(@RequestBody StaffOrderRequest request,
                                                  @AuthenticationPrincipal AuthenticatedUser user) {
        Long branchScope = scopedBranchId(user);
        if (request != null && branchScope != null) {
            request.branchId = branchScope;
        }
        if (request != null && isSalesStaff(user) && user.getUserId() != null) {
            request.employeeId = user.getUserId();
        }
        if (request == null || request.employeeId == null || request.branchId == null) {
            throw new BadRequestException("employeeId and branchId are required");
        }
        if (request.items == null || request.items.isEmpty()) {
            throw new BadRequestException("Order must contain at least one item");
        }

        LocalDateTime now = LocalDateTime.now();
        OrderEntity order = new OrderEntity();
        order.setCustomerId(request.customerId);
        order.setEmployeeId(request.employeeId);
        order.setBranchId(request.branchId);
        order.setCouponId(request.couponId);
        order.setOrderType(normalizeOrderType(request.orderType));
        order.setStatus(blankToDefault(request.status, "pending"));
        order.setNote(request.note);
        order.setCreatedAt(now);
        order.setUpdatedAt(now);
        order = orderRepository.save(order);

        long subtotal = 0L;
        for (StaffOrderItemRequest item : request.items) {
            if (item.quantity == null || item.quantity <= 0) {
                throw new BadRequestException("Item quantity must be greater than 0");
            }
            Long unitPrice = item.unitPrice == null ? 0L : item.unitPrice;
            OrderDetail detail = new OrderDetail();
            detail.setOrderId(order.getOrderId());
            detail.setProductId(item.productId);
            detail.setComboId(item.comboId);
            detail.setQuantity(item.quantity);
            detail.setUnitPrice(unitPrice);
            detail.setSizeId(item.sizeId);
            detail.setNote(item.note);
            detail = detailRepository.save(detail);

            long toppingTotal = 0L;
            if (item.toppings != null) {
                for (StaffOrderToppingRequest toppingRequest : item.toppings) {
                    if (toppingRequest.ingredientId == null) continue;
                    OrderDetailTopping topping = new OrderDetailTopping();
                    topping.setOrderDetailId(detail.getOrderDetailId());
                    topping.setIngredientId(toppingRequest.ingredientId);
                    topping.setQuantity(toppingRequest.quantity == null ? 1 : toppingRequest.quantity);
                    topping.setToppingPrice(toppingRequest.toppingPrice == null ? 0L : toppingRequest.toppingPrice);
                    toppingRepository.save(topping);
                    toppingTotal += topping.getToppingPrice() * topping.getQuantity();
                }
            }
            subtotal += (unitPrice + toppingTotal) * item.quantity;
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
        payment.setStatus("paid");
        payment.setPaidAt(now);
        paymentRepository.save(payment);

        return ApiResponse.success("Created", toResponse(order));
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public ApiResponse<StaffOrderResponse> updateStatus(@PathVariable Long id,
                                                        @RequestBody StaffStatusRequest request,
                                                        @AuthenticationPrincipal AuthenticatedUser user) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Order not found"));
        assertSameBranch(order, user);
        String next = normalize(request == null ? null : request.status);
        if (!ALLOWED_STATUSES.contains(next)) {
            throw new BadRequestException("Invalid order status");
        }
        if ("completed".equals(normalize(order.getStatus())) || "cancelled".equals(normalize(order.getStatus()))) {
            throw new BadRequestException("Order status cannot be changed");
        }
        if ("confirmed".equals(next) && "pending".equals(normalize(order.getStatus()))) {
            order.setOrderType("delivery");
        }
        order.setStatus(next);
        order.setUpdatedAt(LocalDateTime.now());
        if ("cancelled".equals(next) && request != null && request.cancelReason != null && !request.cancelReason.isBlank()) {
            order.setNote(appendCancelReason(order.getNote(), request.cancelReason));
        }
        order = orderRepository.save(order);
        rewardService.awardIfCompleted(order);
        return ApiResponse.success(toResponse(order));
    }

    private StaffOrderResponse toResponse(OrderEntity order) {
        StaffOrderResponse response = new StaffOrderResponse();
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
            customerRepository.findById(order.getCustomerId()).map(Customer::getName).ifPresent(name -> response.customerName = name);
            customerDetailRepository.findById(order.getCustomerId()).ifPresent(detail -> {
                response.customerPhone = detail.getPhoneNumber();
                response.customerEmail = detail.getEmail();
                response.deliveryAddress = detail.getAddress();
            });
        }
        response.customerName = firstNonBlank(extractNoteValue(order.getNote(), "Khach hang"), response.customerName);
        response.customerPhone = firstNonBlank(extractNoteValue(order.getNote(), "So dien thoai"), response.customerPhone);
        response.customerEmail = firstNonBlank(extractNoteValue(order.getNote(), "Email"), response.customerEmail);
        response.deliveryAddress = firstNonBlank(
                extractNoteValue(order.getNote(), "Giao den"),
                extractNoteValue(order.getNote(), "Dia chi"),
                response.deliveryAddress
        );

        List<OrderDetail> details = detailRepository.findAll().stream()
                .filter(detail -> Objects.equals(order.getOrderId(), detail.getOrderId()))
                .toList();
        long total = 0L;
        response.items = new ArrayList<>();
        for (OrderDetail detail : details) {
            StaffOrderItemResponse item = new StaffOrderItemResponse();
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
            item.size = detail.getSizeId() == null ? "" : sizeRepository.findById(detail.getSizeId()).map(ProductSize::getSize).orElse("");
            item.toppings = new ArrayList<>();

            long toppingTotal = 0L;
            List<OrderDetailTopping> toppings = toppingRepository.findAll().stream()
                    .filter(topping -> Objects.equals(detail.getOrderDetailId(), topping.getOrderDetailId()))
                    .toList();
            for (OrderDetailTopping topping : toppings) {
                StaffOrderToppingResponse toppingResponse = new StaffOrderToppingResponse();
                toppingResponse.ingredientId = topping.getIngredientId();
                toppingResponse.quantity = topping.getQuantity();
                toppingResponse.toppingPrice = topping.getToppingPrice() == null ? 0L : topping.getToppingPrice();
                toppingResponse.name = ingredientRepository.findById(topping.getIngredientId())
                        .map(Ingredient::getIngredientName)
                        .orElse("Topping #" + topping.getIngredientId());
                item.toppingDetails.add(toppingResponse);
                item.toppings.add(toppingResponse.name);
                toppingTotal += toppingResponse.toppingPrice * (toppingResponse.quantity == null ? 1 : toppingResponse.quantity);
            }

            total += (item.unitPrice + toppingTotal) * item.qty;
            response.items.add(item);
        }

        Payment payment = paymentRepository.findByOrderId(order.getOrderId()).orElse(null);
        response.total = total;
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
        return response;
    }

    private Specification<OrderEntity> orderSpecification(Long branchId, Long employeeId, String statusFilter) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) {
                predicates.add(criteriaBuilder.equal(root.get("branchId"), branchId));
            }
            if (employeeId != null) {
                predicates.add(criteriaBuilder.equal(root.get("employeeId"), employeeId));
            }
            if (statusFilter != null && !statusFilter.isBlank()) {
                predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("status")), statusFilter));
            }
            return predicates.isEmpty()
                    ? criteriaBuilder.conjunction()
                    : criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private String resolveItemName(OrderDetail detail) {
        if (detail.getProductId() != null) {
            return productRepository.findById(detail.getProductId())
                    .map(Product::getProductName)
                    .orElse("Product #" + detail.getProductId());
        }
        if (detail.getComboId() != null) {
            return "Combo #" + detail.getComboId();
        }
        return "Item";
    }

    private long calculateDiscount(Coupon coupon, long total) {
        if (!"active".equalsIgnoreCase(blankToDefault(coupon.getStatus(), "active"))) {
            throw new BadRequestException("Coupon is inactive");
        }
        LocalDate today = LocalDate.now();
        if (coupon.getStartDate() != null && today.isBefore(coupon.getStartDate())) {
            throw new BadRequestException("Coupon has not started");
        }
        if (coupon.getEndDate() != null && today.isAfter(coupon.getEndDate())) {
            throw new BadRequestException("Coupon has expired");
        }
        if (coupon.getUsageLimit() != null && coupon.getUsedCount() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
            throw new BadRequestException("Coupon usage limit reached");
        }
        if (coupon.getMinOrderValue() != null && total < coupon.getMinOrderValue()) {
            throw new BadRequestException("Order total is below coupon minimum");
        }
        long value = coupon.getDiscountValue() == null ? 0L : coupon.getDiscountValue();
        String type = normalize(coupon.getDiscountType());
        long discount = type.contains("percent") || type.contains("percentage")
                ? Math.round(total * (value / 100.0))
                : value;
        if (coupon.getMaxDiscount() != null && coupon.getMaxDiscount() > 0) {
            discount = Math.min(discount, coupon.getMaxDiscount());
        }
        return Math.max(0L, Math.min(discount, total));
    }

    private String appendCancelReason(String note, String reason) {
        String prefix = "Cancel reason: ";
        if (note == null || note.isBlank()) return prefix + reason;
        return note + "\n" + prefix + reason;
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalizeOrderType(String value) {
        String normalized = normalize(value);
        if ("delivery".equals(normalized) || "giao hang".equals(normalized) || "giao hàng".equals(normalized)) {
            return "delivery";
        }
        return "dine-in";
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
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
        return "";
    }

    private String normalizeText(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private void assertSameBranch(OrderEntity order, AuthenticatedUser user) {
        Long branchId = scopedBranchId(user);
        if (branchId != null && !Objects.equals(branchId, order.getBranchId())) {
            throw new AccessDeniedException("Order does not belong to your branch");
        }
    }

    private Long scopedBranchId(AuthenticatedUser user) {
        if (user == null || user.getRoleName() == null) {
            return null;
        }
        if (!isBranchScoped(user)) {
            return null;
        }
        if (user.getBranchId() == null) {
            throw new BadRequestException("Account is not assigned to a branch");
        }
        return user.getBranchId();
    }

    private boolean isBranchScoped(AuthenticatedUser user) {
        String role = normalizedRole(user);
        return isBranchManager(role) || isSalesStaff(role);
    }

    private boolean isBranchManager(String role) {
        return "branch manager".equals(role)
                || role.contains("quan ly chi nhanh")
                || role.contains("quan ly ban hang")
                || role.contains("sales manager")
                || role.contains("sale manager");
    }

    private boolean isSalesStaff(AuthenticatedUser user) {
        return isSalesStaff(normalizedRole(user));
    }

    private boolean isSalesStaff(String role) {
        return "sales staff".equals(role)
                || "sale staff".equals(role)
                || "branch staff".equals(role)
                || "staff".equals(role)
                || "employee".equals(role)
                || role.endsWith(" sales staff")
                || role.endsWith(" employee")
                || role.contains("cashier")
                || role.contains("nhan vien ban hang")
                || role.contains("nhan vien pha che")
                || (role.contains("nhan vien")
                    && !role.contains("quan ly")
                    && !role.contains("nhan vien van chuyen")
                    && !role.contains("nhan vien giao hang"));
    }

    private String normalizedRole(AuthenticatedUser user) {
        if (user == null || user.getRoleName() == null) {
            return "";
        }
        return Normalizer.normalize(user.getRoleName(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('_', ' ')
                .trim();
    }

    public static class StaffOrderRequest {
        public Long customerId;
        public Long employeeId;
        public Long branchId;
        public Long couponId;
        public String orderType;
        public String status;
        public String note;
        public String paymentMethod;
        public String paymentProvider;
        public Long amount;
        public Long discount;
        public Integer dripsUsed;
        public List<StaffOrderItemRequest> items;
    }

    public static class StaffOrderItemRequest {
        public Long productId;
        public Long comboId;
        public Integer quantity;
        public Long unitPrice;
        public Long sizeId;
        public String note;
        public List<StaffOrderToppingRequest> toppings;
    }

    public static class StaffOrderToppingRequest {
        public Long ingredientId;
        public Integer quantity;
        public Long toppingPrice;
    }

    public static class StaffStatusRequest {
        public String status;
        public String cancelReason;
    }

    public static class CouponValidationResponse {
        public Long couponId;
        public String code;
        public Long discount;
        public String discountType;
        public Long discountValue;
    }

    public static class StaffOrderResponse {
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
        public String customerName = "";
        public String customerPhone = "";
        public String customerEmail = "";
        public String deliveryAddress = "";
        public Long total = 0L;
        public Long discount = 0L;
        public Integer dripsUsed;
        public Long amount = 0L;
        public List<StaffOrderItemResponse> items = new ArrayList<>();
    }

    public static class StaffOrderItemResponse {
        public Long orderDetailId;
        public Long productId;
        public Long comboId;
        public String name;
        public Integer qty;
        public Integer quantity;
        public String size;
        public Long sizeId;
        public List<String> toppings = new ArrayList<>();
        public List<StaffOrderToppingResponse> toppingDetails = new ArrayList<>();
        public String note;
        public Long unitPrice;
        public Long price;
    }

    public static class StaffOrderToppingResponse {
        public Long ingredientId;
        public String name;
        public Integer quantity;
        public Long toppingPrice;
    }
}
