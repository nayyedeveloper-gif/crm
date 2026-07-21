package com.salecrm.permission;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class PermissionCatalog {

    private PermissionCatalog() {
    }

    public static final List<String> KEYS = List.of(
            "DASHBOARD_VIEW",
            "CRM_VIEW",
            "CRM_EDIT",
            "CRM_EXPORT",
            "SHOWCASE_MANAGE",
            "SALES_VIEW",
            "SALES_IMPORT",
            "PERFORMANCE_VIEW",
            "PERFORMANCE_EDIT_TARGET",
            "REPORT_VIEW",
            "HELP_VIEW",
            "API_DOCS_VIEW",
            "BRANCH_ALL",
            "BRANCHES_MANAGE",
            "USERS_MANAGE",
            "PERMISSIONS_MANAGE",
            "BACKUP_MANAGE",
            "SHOP_DASHBOARD_VIEW",
            "PRODUCTS_MANAGE",
            "ORDERS_MANAGE",
            "INQUIRIES_MANAGE",
            "SHOP_USERS_MANAGE",
            "SETTINGS_APPEARANCE",
            "SETTINGS_GENERAL",
            "CHANGE_LOGS_VIEW",
            "SYSTEM_LOGS_VIEW"
    );

    public static final Map<String, String> LABELS = new LinkedHashMap<>();

    static {
        LABELS.put("DASHBOARD_VIEW", "Dashboard");
        LABELS.put("CRM_VIEW", "CRM History — View");
        LABELS.put("CRM_EDIT", "CRM History — Create / Edit");
        LABELS.put("CRM_EXPORT", "CRM History — Export");
        LABELS.put("SHOWCASE_MANAGE", "Show Case");
        LABELS.put("SALES_VIEW", "Sales Dashboard");
        LABELS.put("SALES_IMPORT", "Sales — Import data");
        LABELS.put("PERFORMANCE_VIEW", "Performance — View");
        LABELS.put("PERFORMANCE_EDIT_TARGET", "Performance — Edit Target");
        LABELS.put("REPORT_VIEW", "Report");
        LABELS.put("HELP_VIEW", "How to use");
        LABELS.put("API_DOCS_VIEW", "API Docs");
        LABELS.put("BRANCH_ALL", "All Branches access");
        LABELS.put("BRANCHES_MANAGE", "Branches / Shops");
        LABELS.put("USERS_MANAGE", "Users management");
        LABELS.put("PERMISSIONS_MANAGE", "Permission & Access");
        LABELS.put("BACKUP_MANAGE", "Backup (auto / manual)");
        LABELS.put("SHOP_DASHBOARD_VIEW", "Shop — Dashboard");
        LABELS.put("PRODUCTS_MANAGE", "Shop — Products");
        LABELS.put("ORDERS_MANAGE", "Shop — Orders");
        LABELS.put("INQUIRIES_MANAGE", "Shop — Inquiries");
        LABELS.put("SHOP_USERS_MANAGE", "Shop — Users");
        LABELS.put("SETTINGS_APPEARANCE", "Settings — Appearance");
        LABELS.put("SETTINGS_GENERAL", "Settings — General (edit)");
        LABELS.put("CHANGE_LOGS_VIEW", "Change logs");
        LABELS.put("SYSTEM_LOGS_VIEW", "System logs");
    }

    /** Shop module keys (Allow / None only). */
    public static final Set<String> SHOP_KEYS = Set.of(
            "SHOP_DASHBOARD_VIEW",
            "PRODUCTS_MANAGE",
            "ORDERS_MANAGE",
            "INQUIRIES_MANAGE",
            "SHOP_USERS_MANAGE"
    );

    /** Permissions that ADMIN must always keep as ALLOW. */
    public static final Set<String> ADMIN_LOCKED = Set.of(
            "USERS_MANAGE",
            "PERMISSIONS_MANAGE",
            "BACKUP_MANAGE",
            "SETTINGS_GENERAL",
            "CHANGE_LOGS_VIEW",
            "SYSTEM_LOGS_VIEW",
            "BRANCH_ALL",
            "BRANCHES_MANAGE"
    );

    public static final Set<String> LEVELS = Set.of("NONE", "ALLOW", "OWN");
}
