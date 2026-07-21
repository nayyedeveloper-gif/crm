package com.salecrm.sales.service;

import com.salecrm.branch.entity.Branch;
import com.salecrm.branch.repository.BranchRepository;
import com.salecrm.common.exception.ForbiddenBranchAccessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.sales.dto.SalesStatusResponse;
import com.salecrm.sales.dto.SalesTargetSheetResponse;
import com.salecrm.sales.dto.SalesTransactionCreateRequest;
import com.salecrm.sales.dto.SalesTransactionFilter;
import com.salecrm.sales.entity.SalesMonthlyTarget;
import com.salecrm.sales.entity.SalesTransaction;
import com.salecrm.sales.repository.SalesMonthlyTargetRepository;
import com.salecrm.sales.repository.SalesTransactionRepository;
import com.salecrm.sales.support.SalesBranchMapper;
import com.salecrm.sales.support.SalesRowMapper;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class SalesService {

    private final SalesTransactionRepository transactionRepository;
    private final SalesMonthlyTargetRepository targetRepository;
    private final BranchRepository branchRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTransactions(LocalDate from, LocalDate to) {
        SalesTransactionFilter filter = new SalesTransactionFilter(from, to, resolveBranchNames());
        Specification<SalesTransaction> spec = com.salecrm.sales.dto.SalesTransactionSpec.withFilter(filter);

        return transactionRepository.findAll(spec).stream()
                .map(SalesRowMapper::toDataRow)
                .toList();
    }

    @Transactional
    public Map<String, Object> createTransaction(SalesTransactionCreateRequest request) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        if (!user.isCrossBranch()) {
            List<String> allowed = resolveBranchNames();
            if (allowed != null && !allowed.contains(request.branchName())) {
                throw new ForbiddenBranchAccessException();
            }
        }

        SalesTransaction entity = SalesTransaction.builder()
                .saleDate(request.saleDate())
                .branchName(StringUtils.hasText(request.branchName()) ? request.branchName().trim() : "Unknown")
                .reason(trim(request.reason()))
                .salesStaff(trim(request.salesStaff()))
                .buyerName(trim(request.buyerName()))
                .contactNumber(trim(request.contactNumber()))
                .township(trim(request.township()))
                .region(trim(request.region()))
                .customerType(trim(request.customerType()))
                .qty(request.qty())
                .gram(request.gram())
                .amount(request.amount())
                .itemCategory(trim(request.itemCategory()))
                .itemMainGroup(trim(request.itemMainGroup()))
                .itemsCode(trim(request.itemsCode()))
                .purity(trim(request.purity()))
                .specialEvent(trim(request.specialEvent()))
                .build();

        SalesTransaction saved = transactionRepository.save(entity);
        return SalesRowMapper.toDataRow(saved);
    }

    @Transactional(readOnly = true)
    public SalesTargetSheetResponse getTargets(String month) {
        String monthLabel = StringUtils.hasText(month)
                ? month.trim()
                : LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM", Locale.ENGLISH));

        List<SalesMonthlyTarget> rows = targetRepository.findByMonthLabelIgnoreCase(monthLabel);
        if (rows.isEmpty()) {
            return new SalesTargetSheetResponse(monthLabel, Map.of(), Map.of());
        }

        Map<String, Object> total = null;
        Map<String, Map<String, Object>> shops = new LinkedHashMap<>();

        for (SalesMonthlyTarget row : rows) {
            Map<String, Object> entry = toTargetShopMap(row);
            if (row.isCompanyTotal()) {
                total = entry;
            } else {
                shops.put(normalizeShopKey(row.getShopName()), entry);
                shops.putIfAbsent(row.getShopName(), entry);
            }
        }

        if (total == null) {
            total = computeTotalFromShops(shops.values());
        }

        return new SalesTargetSheetResponse(monthLabel, total, shops);
    }

    @Transactional(readOnly = true)
    public SalesStatusResponse status() {
        resolveBranchNames(); // access check
        return new SalesStatusResponse(
                transactionRepository.countAll(),
                transactionRepository.findLatestSaleDate().orElse(null),
                transactionRepository.findLastUpdated().orElse(null)
        );
    }

    private List<String> resolveBranchNames() {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        if (user.isCrossBranch()) {
            return null;
        }
        Long branchId = user.getBranchId();
        if (branchId == null) {
            throw new ForbiddenBranchAccessException();
        }
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", branchId));
        return SalesBranchMapper.salesBranchNames(branch);
    }

    private static String trim(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private static Map<String, Object> toTargetShopMap(SalesMonthlyTarget row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("shop", row.getShopName());
        map.put("diamond", category(row.getDiamondQty(), row.getDiamondAmount()));
        map.put("pt", category(row.getPtQty(), row.getPtAmount()));
        map.put("gold15", category(row.getGold15Qty(), row.getGold15Amount()));
        map.put("gold16", category(row.getGold16Qty(), row.getGold16Amount()));
        map.put("total", category(row.getTotalQty(), row.getTotalAmount()));
        return map;
    }

    private static Map<String, Object> category(java.math.BigDecimal qty, java.math.BigDecimal amount) {
        Map<String, Object> cat = new LinkedHashMap<>();
        cat.put("qty", qty != null ? qty.doubleValue() : 0d);
        cat.put("amount", amount != null ? amount.doubleValue() : 0d);
        return cat;
    }

    private static String normalizeShopKey(String shop) {
        return shop == null ? "" : shop.toLowerCase()
                .replaceFirst("^29\\s*", "")
                .replaceAll("\\s+", "")
                .trim();
    }

    private static Map<String, Object> computeTotalFromShops(Collection<Map<String, Object>> shopEntries) {
        double dQty = 0, dAmt = 0, ptQty = 0, ptAmt = 0, g15Qty = 0, g15Amt = 0, g16Qty = 0, g16Amt = 0, tQty = 0, tAmt = 0;
        for (Map<String, Object> shop : shopEntries) {
            dQty += metric(shop, "diamond", "qty");
            dAmt += metric(shop, "diamond", "amount");
            ptQty += metric(shop, "pt", "qty");
            ptAmt += metric(shop, "pt", "amount");
            g15Qty += metric(shop, "gold15", "qty");
            g15Amt += metric(shop, "gold15", "amount");
            g16Qty += metric(shop, "gold16", "qty");
            g16Amt += metric(shop, "gold16", "amount");
            tQty += metric(shop, "total", "qty");
            tAmt += metric(shop, "total", "amount");
        }
        Map<String, Object> total = new LinkedHashMap<>();
        total.put("diamond", Map.of("qty", dQty, "amount", dAmt));
        total.put("pt", Map.of("qty", ptQty, "amount", ptAmt));
        total.put("gold15", Map.of("qty", g15Qty, "amount", g15Amt));
        total.put("gold16", Map.of("qty", g16Qty, "amount", g16Amt));
        total.put("total", Map.of("qty", tQty, "amount", tAmt));
        return total;
    }

    @SuppressWarnings("unchecked")
    private static double metric(Map<String, Object> shop, String category, String field) {
        Object cat = shop.get(category);
        if (!(cat instanceof Map<?, ?> map)) {
            return 0d;
        }
        Object value = map.get(field);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return 0d;
    }
}
