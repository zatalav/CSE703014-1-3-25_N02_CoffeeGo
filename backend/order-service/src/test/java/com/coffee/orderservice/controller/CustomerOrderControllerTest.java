package com.coffee.orderservice.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.coffee.orderservice.entity.Combo;
import com.coffee.orderservice.entity.OrderDetail;
import com.coffee.orderservice.entity.OrderEntity;
import com.coffee.orderservice.entity.Payment;
import com.coffee.orderservice.repository.ComboRepository;
import com.coffee.orderservice.repository.CouponRepository;
import com.coffee.orderservice.repository.CustomerDetailRepository;
import com.coffee.orderservice.repository.CustomerRepository;
import com.coffee.orderservice.repository.OrderDetailRepository;
import com.coffee.orderservice.repository.OrderEntityRepository;
import com.coffee.orderservice.repository.PaymentRepository;
import com.coffee.orderservice.repository.ProductRepository;
import com.coffee.orderservice.repository.ProductSizeRepository;
import com.coffee.orderservice.service.CustomerRewardService;
import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class CustomerOrderControllerTest {

    @Test
    void normalizePaymentMethodKeepsDatabaseEnumValues() throws Exception {
        CustomerOrderController controller = new CustomerOrderController(null, null, null, null, null, null, null, null, null, null, null);
        Method method = CustomerOrderController.class.getDeclaredMethod(
                "normalizePaymentMethod",
                String.class,
                String.class
        );
        method.setAccessible(true);

        assertEquals("cash", method.invoke(controller, null, null));
        assertEquals("cash", method.invoke(controller, "cash", null));
        assertEquals("e_wallet", method.invoke(controller, "e_wallet", null));
        assertEquals("e_wallet", method.invoke(controller, "qr", null));
        assertEquals("e_wallet", method.invoke(controller, "points", null));
        assertEquals("e_wallet", method.invoke(controller, "vnpay", "vnpay"));
        assertEquals("e_wallet", method.invoke(controller, "vietqr", "vietqr"));
        assertEquals("e_wallet", method.invoke(controller, "momo", "momo"));
        assertEquals("e_wallet", method.invoke(controller, "zalopay", "zalopay"));
    }

    @Test
    void createAcceptsComboOnlyItemWithoutProductId() {
        OrderEntityRepository orderRepository = mock(OrderEntityRepository.class);
        OrderDetailRepository detailRepository = mock(OrderDetailRepository.class);
        PaymentRepository paymentRepository = mock(PaymentRepository.class);
        CouponRepository couponRepository = mock(CouponRepository.class);
        ComboRepository comboRepository = mock(ComboRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        ProductSizeRepository sizeRepository = mock(ProductSizeRepository.class);
        CustomerRepository customerRepository = mock(CustomerRepository.class);
        CustomerDetailRepository customerDetailRepository = mock(CustomerDetailRepository.class);
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        CustomerRewardService rewardService = mock(CustomerRewardService.class);
        List<OrderDetail> savedDetails = new ArrayList<>();

        Combo combo = new Combo();
        combo.setComboId(3L);
        combo.setComboName("Smoke Combo");
        combo.setPrice(88_000L);
        combo.setStatus("active");
        combo.setStartDate(LocalDate.now().minusDays(1));
        combo.setEndDate(LocalDate.now().plusDays(1));

        doReturn(true).when(customerRepository).existsById(10L);
        doReturn(Optional.empty()).when(customerRepository).findById(10L);
        doReturn(Optional.empty()).when(customerDetailRepository).findById(10L);
        doReturn(Optional.of(combo)).when(comboRepository).findById(3L);
        doReturn(Optional.empty()).when(paymentRepository).findByOrderId(123L);
        doReturn(1).when(jdbcTemplate).queryForObject(anyString(), eq(Integer.class), any(Object[].class));
        doReturn(savedDetails).when(detailRepository).findAll();
        doAnswer(invocation -> {
            OrderEntity order = invocation.getArgument(0);
            order.setOrderId(123L);
            return order;
        }).when(orderRepository).save(any(OrderEntity.class));
        doAnswer(invocation -> {
            OrderDetail detail = invocation.getArgument(0);
            detail.setOrderDetailId(456L);
            savedDetails.add(detail);
            return detail;
        }).when(detailRepository).save(any(OrderDetail.class));
        doAnswer(invocation -> invocation.getArgument(0)).when(paymentRepository).save(any(Payment.class));

        CustomerOrderController controller = new CustomerOrderController(
                orderRepository,
                detailRepository,
                paymentRepository,
                couponRepository,
                comboRepository,
                productRepository,
                sizeRepository,
                customerRepository,
                customerDetailRepository,
                jdbcTemplate,
                rewardService);
        CustomerOrderController.CustomerOrderItemRequest item = new CustomerOrderController.CustomerOrderItemRequest();
        item.comboId = 3L;
        item.quantity = 1;
        item.unitPrice = 88_000L;
        item.name = "Smoke Combo";

        CustomerOrderController.CustomerOrderRequest request = new CustomerOrderController.CustomerOrderRequest();
        request.customerId = 10L;
        request.branchId = 2L;
        request.employeeId = 5L;
        request.orderType = "delivery";
        request.paymentMethod = "cash";
        request.paymentStatus = "paid";
        request.amount = 88_000L;
        request.items = List.of(item);

        controller.create(request, null);

        assertEquals(1, savedDetails.size());
        OrderDetail savedDetail = savedDetails.get(0);
        assertNull(savedDetail.getProductId());
        assertEquals(3L, savedDetail.getComboId());
        assertEquals(1, savedDetail.getQuantity());
        assertEquals(88_000L, savedDetail.getUnitPrice());
        verify(comboRepository, times(2)).findById(3L);
    }
}
