package com.salecrm.sales.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salecrm.sales.entity.SalesTransaction;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps DB rows to the JSON shape expected by the Sales SPA (legacy sheet column names).
 */
public final class SalesRowMapper {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

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
        if (t.getBuyerNrc() != null) {
            row.put("မှတ်ပုံတင်အမှတ်", t.getBuyerNrc());
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
            row.put("Type", t.getCustomerType());
        }
        if (t.getGroupSize() != null) {
            row.put("တဖွဲ့တွင်ပါဝင်သောလူဦးရေ", String.valueOf(t.getGroupSize()));
        }
        if (t.getQty() != null) {
            String qty = formatNumber(t.getQty());
            row.put("QTY", qty);
            row.put("Qty", qty);
        }
        if (t.getGram() != null) {
            row.put("Gram", formatNumber(t.getGram()));
        }
        if (t.getAmount() != null) {
            String amount = formatNumber(t.getAmount());
            row.put("Voucher Amount", amount);
            row.put("Total Amount", amount);
            row.put("Amount", amount);
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
            row.put("Remark", t.getSpecialEvent());
        }

        // Extended form.csv fields stored as JSON — merge for CM View compatibility
        mergeFormExtra(row, t.getFormExtra());
        return row;
    }

    private static void mergeFormExtra(Map<String, Object> row, String formExtraJson) {
        if (!StringUtils.hasText(formExtraJson)) {
            return;
        }
        try {
            Map<String, Object> extra = OBJECT_MAPPER.readValue(formExtraJson, MAP_TYPE);
            if (extra == null || extra.isEmpty()) {
                return;
            }
            for (Map.Entry<String, Object> entry : extra.entrySet()) {
                String key = entry.getKey();
                Object value = entry.getValue();
                if (!StringUtils.hasText(key) || value == null) {
                    continue;
                }
                // Do not overwrite core mapped columns with null-ish blanks
                if (row.containsKey(key) && isBlankish(value)) {
                    continue;
                }
                if (!row.containsKey(key) || isBlankish(row.get(key))) {
                    row.put(key, value);
                } else if (!row.containsKey(key)) {
                    row.put(key, value);
                } else {
                    // Prefer explicit form extra for supplemental columns only
                    row.putIfAbsent(key, value);
                }
            }
        } catch (Exception ignored) {
            // Keep core row if extra JSON is malformed
        }
    }

    private static boolean isBlankish(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof String s) {
            return s.isBlank() || "null".equalsIgnoreCase(s);
        }
        return false;
    }

    private static String formatNumber(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
