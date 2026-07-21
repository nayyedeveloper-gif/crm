package com.salecrm.shopdashboard.dto;

import com.salecrm.dashboard.dto.NamedCount;
import com.salecrm.order.dto.ShopOrderResponse;

import java.math.BigDecimal;
import java.util.List;

public record ShopDashboardSummary(
        long totalOrders,
        long activeOrders,
        BigDecimal revenueAmount,
        long ordersToday,
        BigDecimal revenueToday,
        long ordersThisMonth,
        BigDecimal revenueThisMonth,
        long pendingPayment,
        long awaitingConfirmation,
        long shipped,
        long delivered,
        long totalInquiries,
        long newInquiries,
        long catalogProducts,
        List<NamedCount> byStatus,
        List<ShopBestSeller> bestSellers,
        List<ShopBestSeller> topInquiryItems,
        List<ShopOrderResponse> recentOrders
) {
    public record ShopBestSeller(
            String publicCode,
            String productCode,
            String name,
            String category,
            long quantity,
            long orderCount,
            BigDecimal amount
    ) {
    }
}
