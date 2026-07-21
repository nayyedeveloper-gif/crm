package com.salecrm.sales.support;

import com.salecrm.sales.entity.SalesTransaction;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps DB rows to the JSON shape expected by the Sales SPA (legacy Google Sheet columns).
 */
public final class SalesRowMapper {

    private SalesRowMapper() {
    }

    public static Map<String, Object> toDataRow(SalesTransaction t) {
        Map<String, Object> row = new LinkedHashMap<>();
        if (t.getTransactionTs() != null) {
            row.put("Timestamp", t.getTransactionTs());
        }
        if (t.getSaleDate() != null) {
            row.put("Date", t.getSaleDate().toString());
        }
        row.put("Branch အမည်", t.getBranchName());
        if (t.getReason() != null) {
            row.put("အကြောင်းအရာ", t.getReason());
        }
        if (t.getSalesStaff() != null) {
            row.put("အရောင်းသမားအမည်", t.getSalesStaff());
        }
        if (t.getCustomerService() != null) {
            row.put("Customer Service အမည်", t.getCustomerService());
        }
        if (t.getBuyerName() != null) {
            row.put("ဝယ်သူ အမည်", t.getBuyerName());
        }
        if (t.getContactNumber() != null) {
            row.put("Contact Number", t.getContactNumber());
        }
        if (t.getTownship() != null) {
            row.put("Township", t.getTownship());
        }
        if (t.getRegion() != null) {
            row.put("Region", t.getRegion());
        }
        if (t.getCustomerType() != null) {
            row.put("Customer Type(Old/New)", t.getCustomerType());
        }
        if (t.getGroupSize() != null) {
            row.put("တဖွဲ့တွင်ပါဝင်သောလူဦးရေ", String.valueOf(t.getGroupSize()));
        }
        if (t.getQty() != null) {
            row.put("QTY", formatNumber(t.getQty()));
            row.put("Qty", formatNumber(t.getQty()));
        }
        if (t.getGram() != null) {
            row.put("Gram", formatNumber(t.getGram()));
        }
        if (t.getAmount() != null) {
            row.put("Voucher Amount", formatNumber(t.getAmount()));
        }
        if (t.getItemCategory() != null) {
            row.put("Item Category", t.getItemCategory());
        }
        if (t.getItemMainGroup() != null) {
            row.put("Item Main Group", t.getItemMainGroup());
        }
        if (t.getItemsCode() != null) {
            row.put("Items Code", t.getItemsCode());
        }
        if (t.getPurity() != null) {
            row.put("ပဲရည်", t.getPurity());
        }
        if (t.getSpecialEvent() != null) {
            row.put("ထူးခြားဖြစ်စဉ်", t.getSpecialEvent());
        }
        return row;
    }

    private static String formatNumber(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
