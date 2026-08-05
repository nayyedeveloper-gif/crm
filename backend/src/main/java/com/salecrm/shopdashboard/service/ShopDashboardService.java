package com.salecrm.shopdashboard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salecrm.dashboard.dto.NamedCount;
import com.salecrm.inquiry.entity.ShopInquiry;
import com.salecrm.inquiry.repository.ShopInquiryRepository;
import com.salecrm.order.dto.ShopOrderResponse;
import com.salecrm.order.entity.ShopOrder;
import com.salecrm.order.repository.ShopOrderRepository;
import com.salecrm.product.repository.ProductRepository;
import com.salecrm.shopdashboard.dto.ShopDashboardSummary;
import com.salecrm.shopdashboard.dto.ShopDashboardSummary.ShopBestSeller;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ShopDashboardService {

    private static final ZoneId YANGON = ZoneId.of("Asia/Yangon");
    private static final String CANCELLED = "CANCELLED";

    private final ShopOrderRepository orderRepository;
    private final ShopInquiryRepository inquiryRepository;
    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public ShopDashboardSummary summary() {
        LocalDate today = LocalDate.now(YANGON);
        Instant dayStart = today.atStartOfDay(YANGON).toInstant();
        Instant monthStart = today.withDayOfMonth(1).atStartOfDay(YANGON).toInstant();

        List<ShopOrder> orders = orderRepository.findAllByOrderByCreatedAtDesc();
        List<ShopInquiry> inquiries = inquiryRepository.findAllByOrderByCreatedAtDesc();

        long totalOrders = orders.size();
        long activeOrders = orders.stream().filter(o -> !CANCELLED.equals(o.getStatus())).count();
        BigDecimal revenue = sumRevenue(orders, null, null);
        long ordersToday = orders.stream()
                .filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(dayStart))
                .count();
        BigDecimal revenueToday = sumRevenue(orders, dayStart, null);
        long ordersThisMonth = orders.stream()
                .filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(monthStart))
                .count();
        BigDecimal revenueThisMonth = sumRevenue(orders, monthStart, null);

        Map<String, Agg> byStatusMap = new HashMap<>();
        for (ShopOrder o : orders) {
            String status = o.getStatus() != null ? o.getStatus() : "UNKNOWN";
            Agg agg = byStatusMap.computeIfAbsent(status, k -> new Agg());
            agg.count++;
            if (o.getTotalAmount() != null) {
                agg.amount = agg.amount.add(o.getTotalAmount());
            }
        }
        List<NamedCount> byStatus = byStatusMap.entrySet().stream()
                .map(e -> new NamedCount(e.getKey(), e.getValue().count, e.getValue().amount))
                .sorted(Comparator.comparingLong(NamedCount::count).reversed())
                .toList();

        long pendingPayment = countStatus(orders, "PENDING_PAYMENT");
        long awaitingConfirmation = countStatus(orders, "AWAITING_CONFIRMATION");
        long shipped = countStatus(orders, "SHIPPED");
        long delivered = countStatus(orders, "DELIVERED");

        long totalInquiries = inquiries.size();
        long newInquiries = inquiries.stream().filter(i -> "NEW".equals(i.getStatus())).count();

        List<ShopBestSeller> bestSellers = aggregateItems(
                orders.stream().filter(o -> !CANCELLED.equals(o.getStatus())).toList(),
                10
        );
        List<ShopBestSeller> topInquiryItems = aggregateInquiryItems(inquiries, 10);

        List<ShopOrderResponse> recent = orders.stream()
                .limit(10)
                .map(this::toOrderResponse)
                .toList();

        return new ShopDashboardSummary(
                totalOrders,
                activeOrders,
                revenue,
                ordersToday,
                revenueToday,
                ordersThisMonth,
                revenueThisMonth,
                pendingPayment,
                awaitingConfirmation,
                shipped,
                delivered,
                totalInquiries,
                newInquiries,
                productRepository.count(),
                byStatus,
                bestSellers,
                topInquiryItems,
                recent
        );
    }

    private BigDecimal sumRevenue(List<ShopOrder> orders, Instant from, Instant to) {
        BigDecimal sum = BigDecimal.ZERO;
        for (ShopOrder o : orders) {
            if (CANCELLED.equals(o.getStatus())) continue;
            Instant created = o.getCreatedAt();
            if (from != null && (created == null || created.isBefore(from))) continue;
            if (to != null && (created == null || !created.isBefore(to))) continue;
            if (o.getTotalAmount() != null) {
                sum = sum.add(o.getTotalAmount());
            }
        }
        return sum;
    }

    private long countStatus(List<ShopOrder> orders, String status) {
        return orders.stream().filter(o -> status.equals(o.getStatus())).count();
    }

    private List<ShopBestSeller> aggregateItems(List<ShopOrder> orders, int limit) {
        Map<String, ItemAgg> map = new HashMap<>();
        for (ShopOrder order : orders) {
            for (LineItem line : parseLines(order.getItemsJson())) {
                String key = StringUtils.hasText(line.publicCode())
                        ? line.publicCode()
                        : (line.productCode() + "|" + line.name());
                ItemAgg agg = map.computeIfAbsent(key, k -> new ItemAgg());
                int qty = line.qty() != null && line.qty() > 0 ? line.qty() : 1;
                agg.quantity += qty;
                agg.orderCount += 1;
                if (StringUtils.hasText(line.publicCode())) agg.publicCode = line.publicCode();
                if (StringUtils.hasText(line.productCode())) agg.productCode = line.productCode();
                if (StringUtils.hasText(line.name())) agg.name = line.name();
                if (StringUtils.hasText(line.category())) agg.category = line.category();
                if (line.price() != null) {
                    agg.amount = agg.amount.add(line.price().multiply(BigDecimal.valueOf(qty)));
                }
            }
        }
        return map.values().stream()
                .sorted(Comparator.comparingLong((ItemAgg a) -> a.quantity).reversed()
                        .thenComparing(a -> a.amount, Comparator.reverseOrder()))
                .limit(limit)
                .map(a -> new ShopBestSeller(
                        a.publicCode,
                        a.productCode,
                        a.name != null ? a.name : "Unknown",
                        a.category,
                        a.quantity,
                        a.orderCount,
                        a.amount
                ))
                .toList();
    }

    private List<ShopBestSeller> aggregateInquiryItems(List<ShopInquiry> inquiries, int limit) {
        Map<String, ItemAgg> map = new HashMap<>();
        for (ShopInquiry inquiry : inquiries) {
            for (LineItem line : parseLines(inquiry.getItemsJson())) {
                String key = StringUtils.hasText(line.publicCode())
                        ? line.publicCode()
                        : (line.productCode() + "|" + line.name());
                ItemAgg agg = map.computeIfAbsent(key, k -> new ItemAgg());
                int qty = line.qty() != null && line.qty() > 0 ? line.qty() : 1;
                agg.quantity += qty;
                agg.orderCount += 1;
                if (StringUtils.hasText(line.publicCode())) agg.publicCode = line.publicCode();
                if (StringUtils.hasText(line.productCode())) agg.productCode = line.productCode();
                if (StringUtils.hasText(line.name())) agg.name = line.name();
                if (StringUtils.hasText(line.category())) agg.category = line.category();
            }
        }
        return map.values().stream()
                .sorted(Comparator.comparingLong((ItemAgg a) -> a.quantity).reversed())
                .limit(limit)
                .map(a -> new ShopBestSeller(
                        a.publicCode,
                        a.productCode,
                        a.name != null ? a.name : "Unknown",
                        a.category,
                        a.quantity,
                        a.orderCount,
                        a.amount
                ))
                .toList();
    }

    private List<LineItem> parseLines(String json) {
        if (!StringUtils.hasText(json)) return List.of();
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(json, new TypeReference<>() {});
            List<LineItem> lines = new ArrayList<>();
            for (Map<String, Object> m : raw) {
                lines.add(new LineItem(
                        str(m.get("publicCode")),
                        str(m.get("productCode")),
                        str(m.get("name")),
                        str(m.get("category")),
                        bd(m.get("price")),
                        intOrNull(m.get("qty"))
                ));
            }
            return lines;
        } catch (Exception e) {
            return List.of();
        }
    }

    private ShopOrderResponse toOrderResponse(ShopOrder o) {
        return new ShopOrderResponse(
                o.getId(),
                o.getOrderCode(),
                o.getCustomerName(),
                o.getPhone(),
                o.getAddress(),
                o.getNote(),
                o.getItemsJson(),
                o.getTotalAmount(),
                o.getStatus(),
                o.getTrackingNumber(),
                o.getPaymentMethod(),
                o.getPaymentRef(),
                o.getPaymentStatus() != null ? o.getPaymentStatus() : "UNPAID",
                o.getTelegramChatId(),
                o.getCreatedAt(),
                o.getUpdatedAt()
        );
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static BigDecimal bd(Object v) {
        if (v == null) return null;
        if (v instanceof BigDecimal b) return b;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            return new BigDecimal(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private static Integer intOrNull(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private static final class Agg {
        long count;
        BigDecimal amount = BigDecimal.ZERO;
    }

    private static final class ItemAgg {
        String publicCode;
        String productCode;
        String name;
        String category;
        long quantity;
        long orderCount;
        BigDecimal amount = BigDecimal.ZERO;
    }

    private record LineItem(
            String publicCode,
            String productCode,
            String name,
            String category,
            BigDecimal price,
            Integer qty
    ) {
    }
}
