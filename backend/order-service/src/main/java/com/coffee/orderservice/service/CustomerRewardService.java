package com.coffee.orderservice.service;

import com.coffee.orderservice.entity.CustomerLoyalty;
import com.coffee.orderservice.entity.MembershipRank;
import com.coffee.orderservice.entity.OrderEntity;
import com.coffee.orderservice.entity.Payment;
import com.coffee.orderservice.entity.PointHistory;
import com.coffee.orderservice.repository.CustomerLoyaltyRepository;
import com.coffee.orderservice.repository.MembershipRankRepository;
import com.coffee.orderservice.repository.PaymentRepository;
import com.coffee.orderservice.repository.PointHistoryRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerRewardService {
    private final CustomerLoyaltyRepository loyaltyRepository;
    private final MembershipRankRepository rankRepository;
    private final PaymentRepository paymentRepository;
    private final PointHistoryRepository pointHistoryRepository;

    public CustomerRewardService(CustomerLoyaltyRepository loyaltyRepository,
                                 MembershipRankRepository rankRepository,
                                 PaymentRepository paymentRepository,
                                 PointHistoryRepository pointHistoryRepository) {
        this.loyaltyRepository = loyaltyRepository;
        this.rankRepository = rankRepository;
        this.paymentRepository = paymentRepository;
        this.pointHistoryRepository = pointHistoryRepository;
    }

    @Transactional
    public RewardSummary awardIfCompleted(OrderEntity order) {
        if (order == null || order.getCustomerId() == null || !"completed".equals(normalize(order.getStatus()))) {
            return RewardSummary.empty(loyaltySummary(order == null ? null : order.getCustomerId()));
        }
        if (pointHistoryRepository.existsByOrderIdAndPointTypeAndAction(order.getOrderId(), "exp", "earn")
                || pointHistoryRepository.existsByOrderIdAndPointTypeAndAction(order.getOrderId(), "drips", "earn")) {
            return RewardSummary.empty(loyaltySummary(order.getCustomerId()));
        }

        Payment payment = paymentRepository.findByOrderId(order.getOrderId()).orElse(null);
        long amount = payment == null || payment.getAmount() == null ? 0L : Math.max(0L, payment.getAmount());
        CustomerLoyalty loyalty = loyaltyRepository.findById(order.getCustomerId()).orElseGet(() -> newDefaultLoyalty(order.getCustomerId()));
        MembershipRank currentRank = rankRepository.findById(loyalty.getRankId()).orElseGet(this::defaultRank);

        int expEarned = Math.max(0, (int) Math.round((amount / 1000.0) * multiplier(currentRank.getExpMultiplier())));
        int dripsEarned = Math.max(0, (int) Math.round((amount / 10000.0) * multiplier(currentRank.getDripsMultiplier())));

        loyalty.setExpPoint(value(loyalty.getExpPoint()) + expEarned);
        loyalty.setDripsPoint(value(loyalty.getDripsPoint()) + dripsEarned);
        loyalty.setTotalMoney(value(loyalty.getTotalMoney()) + amount);
        loyalty.setTotalOrders(value(loyalty.getTotalOrders()) + 1);
        loyalty.setRankId(bestRankFor(loyalty).getRankId());
        loyalty.setUpdatedAt(LocalDateTime.now());
        loyalty = loyaltyRepository.save(loyalty);

        saveHistory(order, "exp", expEarned, loyalty.getExpPoint(), "EXP earned for completed order");
        saveHistory(order, "drips", dripsEarned, loyalty.getDripsPoint(), "DRIP earned for completed order");
        return new RewardSummary(expEarned, dripsEarned, toSummary(loyalty));
    }

    public LoyaltySummary loyaltySummary(Long customerId) {
        if (customerId == null) return null;
        return loyaltyRepository.findById(customerId).map(this::toSummary).orElse(null);
    }

    private CustomerLoyalty newDefaultLoyalty(Long customerId) {
        CustomerLoyalty loyalty = new CustomerLoyalty();
        loyalty.setCustomerId(customerId);
        loyalty.setRankId(defaultRank().getRankId());
        loyalty.setExpPoint(0);
        loyalty.setDripsPoint(0);
        loyalty.setTotalMoney(0L);
        loyalty.setTotalOrders(0);
        loyalty.setUpdatedAt(LocalDateTime.now());
        return loyalty;
    }

    private MembershipRank bestRankFor(CustomerLoyalty loyalty) {
        return activeRanks().stream()
                .filter(rank -> value(loyalty.getExpPoint()) >= value(rank.getMinExp()))
                .filter(rank -> value(loyalty.getTotalMoney()) >= value(rank.getMinTotalMoney()))
                .filter(rank -> value(loyalty.getTotalOrders()) >= value(rank.getMinTotalOrders()))
                .max(Comparator.comparing(rank -> value(rank.getRankOrder())))
                .orElseGet(this::defaultRank);
    }

    private MembershipRank defaultRank() {
        return activeRanks().stream()
                .min(Comparator.comparing(rank -> value(rank.getRankOrder())))
                .orElseGet(() -> {
                    MembershipRank fallback = new MembershipRank();
                    fallback.setRankId(1L);
                    fallback.setRankName("Mầm");
                    fallback.setRankOrder(1);
                    fallback.setExpMultiplier(1.0);
                    fallback.setDripsMultiplier(1.0);
                    return fallback;
                });
    }

    private List<MembershipRank> activeRanks() {
        return rankRepository.findAll().stream()
                .filter(rank -> rank.getStatus() == null || "active".equalsIgnoreCase(rank.getStatus()))
                .toList();
    }

    private void saveHistory(OrderEntity order, String pointType, int amount, int remainingAmount, String note) {
        PointHistory history = new PointHistory();
        history.setCustomerId(order.getCustomerId());
        history.setOrderId(order.getOrderId());
        history.setPointType(pointType);
        history.setAction("earn");
        history.setAmount(amount);
        history.setRemainingAmount(remainingAmount);
        history.setEarnedMonth(LocalDate.now().withDayOfMonth(1));
        history.setExpiredAt(LocalDate.now().plusYears(1));
        history.setStatus("active");
        history.setNote(note);
        history.setCreatedAt(LocalDateTime.now());
        pointHistoryRepository.save(history);
    }

    private LoyaltySummary toSummary(CustomerLoyalty loyalty) {
        MembershipRank rank = rankRepository.findById(loyalty.getRankId()).orElseGet(this::defaultRank);
        return new LoyaltySummary(
                loyalty.getCustomerId(),
                loyalty.getRankId(),
                rank.getRankName(),
                value(loyalty.getExpPoint()),
                value(loyalty.getDripsPoint()),
                value(loyalty.getTotalMoney()),
                value(loyalty.getTotalOrders())
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private double multiplier(Double value) {
        return value == null || value <= 0 ? 1.0 : value;
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private long value(Long value) {
        return value == null ? 0L : value;
    }

    public record RewardSummary(Integer expEarned, Integer dripsEarned, LoyaltySummary loyalty) {
        public static RewardSummary empty(LoyaltySummary loyalty) {
            return new RewardSummary(0, 0, loyalty);
        }
    }

    public record LoyaltySummary(
            Long customerId,
            Long rankId,
            String rankName,
            Integer expPoints,
            Integer dripPoints,
            Long totalMoney,
            Integer totalOrders
    ) {}
}
