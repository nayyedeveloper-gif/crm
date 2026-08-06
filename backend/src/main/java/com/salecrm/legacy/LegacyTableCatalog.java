package com.salecrm.legacy;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Whitelist of Laravel {@code shop_sales} tables exposed via the legacy read API.
 * Framework tables (cache/sessions/migrations/…) are intentionally excluded.
 */
public final class LegacyTableCatalog {

    private LegacyTableCatalog() {
    }

    public static final Map<String, String> TABLES = new LinkedHashMap<>();

    static {
        TABLES.put("activities", "Audit / activity log");
        TABLES.put("audit_logs", "Change audit log");
        TABLES.put("bank_accounts", "Bank accounts");
        TABLES.put("barcode_data", "Barcode data");
        TABLES.put("branches", "Branches / shops");
        TABLES.put("categories", "Categories");
        TABLES.put("costing_data", "Costing data");
        TABLES.put("crm_customer_interactions", "CRM interactions");
        TABLES.put("crm_histories", "CRM histories");
        TABLES.put("crm_staff_performance_targets", "CRM staff targets");
        TABLES.put("dashboard_users", "Dashboard users");
        TABLES.put("default_gran_months", "Default gran months");
        TABLES.put("distribution_data", "Distribution data");
        TABLES.put("distribution_edit_histories", "Distribution edit history");
        TABLES.put("distribution_items", "Distribution items");
        TABLES.put("districts", "Districts");
        TABLES.put("entry_return_new", "Entry / return workflow");
        TABLES.put("gold_purities", "Gold purities");
        TABLES.put("master_setup", "Master setup / sales vouchers");
        TABLES.put("master_setup_advance_usages", "Master setup advance usages");
        TABLES.put("master_setup_credit_payments", "Master setup credit payments");
        TABLES.put("master_setup_payment_methods", "Master setup payment methods");
        TABLES.put("nrc_codes", "NRC codes");
        TABLES.put("pantim_data", "Pantim data");
        TABLES.put("payment_methods", "Payment methods");
        TABLES.put("permission_role", "Role–permission links");
        TABLES.put("permission_user", "User–permission links");
        TABLES.put("permissions", "Permissions");
        TABLES.put("projects", "Projects");
        TABLES.put("raw_data", "Raw data");
        TABLES.put("regions", "Regions");
        TABLES.put("role_user", "User–role links");
        TABLES.put("roles", "Roles");
        TABLES.put("sales_entries", "Sales entries (ledger)");
        TABLES.put("sales_entry_items", "Sales entry line items");
        TABLES.put("shop_assignments", "Shop assignments");
        TABLES.put("shop_standard_stocks", "Shop standard stocks");
        TABLES.put("shop_transfers", "Shop transfers");
        TABLES.put("townships", "Townships");
        TABLES.put("users", "Users");
        TABLES.put("workflow_sections", "Workflow sections");
        TABLES.put("workflow_transfers", "Workflow transfers");
        TABLES.put("workflow_users", "Workflow users");
        TABLES.put("advance_payment_methods", "Advance payment methods");
    }

    public static final Set<String> NAMES = TABLES.keySet();

    public static boolean isAllowed(String table) {
        return table != null && NAMES.contains(table);
    }
}
