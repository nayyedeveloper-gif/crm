package com.salecrm.legacy.service;

import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.common.web.PageResponse;
import com.salecrm.legacy.LegacyTableCatalog;
import com.salecrm.legacy.dto.LegacyHealthResponse;
import com.salecrm.legacy.dto.LegacyTableInfo;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(prefix = "app.legacy-mysql", name = "enabled", havingValue = "true")
public class LegacyReadService {

    private final NamedParameterJdbcTemplate jdbc;

    public LegacyReadService(@Qualifier("legacyJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public LegacyHealthResponse health() {
        String db = jdbc.getJdbcTemplate().queryForObject("SELECT DATABASE()", String.class);
        String host = jdbc.getJdbcTemplate().queryForObject("SELECT @@hostname", String.class);
        List<LegacyTableInfo> tables = new ArrayList<>();
        for (Map.Entry<String, String> e : LegacyTableCatalog.TABLES.entrySet()) {
            tables.add(new LegacyTableInfo(e.getKey(), e.getValue(), count(e.getKey())));
        }
        return new LegacyHealthResponse(true, db, host, tables);
    }

    public List<LegacyTableInfo> listTables() {
        List<LegacyTableInfo> tables = new ArrayList<>();
        for (Map.Entry<String, String> e : LegacyTableCatalog.TABLES.entrySet()) {
            tables.add(new LegacyTableInfo(e.getKey(), e.getValue(), count(e.getKey())));
        }
        return tables;
    }

    public PageResponse<Map<String, Object>> page(String table, int page, int size) {
        requireAllowed(table);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        long total = count(table);
        String sql = "SELECT * FROM `" + table + "` ORDER BY id DESC LIMIT :limit OFFSET :offset";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("limit", safeSize)
                .addValue("offset", (long) safePage * safeSize);
        List<Map<String, Object>> rows = jdbc.query(sql, params, (rs, rowNum) -> mapRow(rs));
        return PageResponse.of(rows, safePage, safeSize, total);
    }

    public Map<String, Object> findById(String table, long id) {
        requireAllowed(table);
        String sql = "SELECT * FROM `" + table + "` WHERE id = :id LIMIT 1";
        List<Map<String, Object>> rows = jdbc.query(sql, Map.of("id", id), (rs, rowNum) -> mapRow(rs));
        if (rows.isEmpty()) {
            throw new ResourceNotFoundException(table, id);
        }
        return rows.get(0);
    }

    public PageResponse<Map<String, Object>> searchCrmHistories(String q, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        String like = (q == null || q.isBlank()) ? null : "%" + q.trim() + "%";

        String countSql = """
                SELECT COUNT(*) FROM crm_histories
                WHERE (:q IS NULL
                   OR customer_name LIKE :q
                   OR phone_number LIKE :q
                   OR nrc_number LIKE :q)
                """;
        String dataSql = """
                SELECT * FROM crm_histories
                WHERE (:q IS NULL
                   OR customer_name LIKE :q
                   OR phone_number LIKE :q
                   OR nrc_number LIKE :q)
                ORDER BY id DESC
                LIMIT :limit OFFSET :offset
                """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("q", like)
                .addValue("limit", safeSize)
                .addValue("offset", (long) safePage * safeSize);

        Long total = jdbc.queryForObject(countSql, params, Long.class);
        List<Map<String, Object>> rows = jdbc.query(dataSql, params, (rs, rowNum) -> mapRow(rs));
        return PageResponse.of(rows, safePage, safeSize, total == null ? 0 : total);
    }

    public PageResponse<Map<String, Object>> searchMasterSetup(String q, Long branchId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        String like = (q == null || q.isBlank()) ? null : "%" + q.trim() + "%";

        String countSql = """
                SELECT COUNT(*) FROM master_setup
                WHERE (:q IS NULL
                   OR customer_name LIKE :q
                   OR phone_number LIKE :q
                   OR voucher_number LIKE :q
                   OR product_code LIKE :q
                   OR nrc_number LIKE :q)
                  AND (:branchId IS NULL OR branch_id = :branchId)
                """;
        String dataSql = """
                SELECT * FROM master_setup
                WHERE (:q IS NULL
                   OR customer_name LIKE :q
                   OR phone_number LIKE :q
                   OR voucher_number LIKE :q
                   OR product_code LIKE :q
                   OR nrc_number LIKE :q)
                  AND (:branchId IS NULL OR branch_id = :branchId)
                ORDER BY id DESC
                LIMIT :limit OFFSET :offset
                """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("q", like)
                .addValue("branchId", branchId)
                .addValue("limit", safeSize)
                .addValue("offset", (long) safePage * safeSize);

        Long total = jdbc.queryForObject(countSql, params, Long.class);
        List<Map<String, Object>> rows = jdbc.query(dataSql, params, (rs, rowNum) -> mapRow(rs));
        return PageResponse.of(rows, safePage, safeSize, total == null ? 0 : total);
    }

    private long count(String table) {
        requireAllowed(table);
        Long n = jdbc.getJdbcTemplate().queryForObject("SELECT COUNT(*) FROM `" + table + "`", Long.class);
        return n == null ? 0 : n;
    }

    private static void requireAllowed(String table) {
        if (!LegacyTableCatalog.isAllowed(table)) {
            throw new BusinessException("Table not allowed: " + table);
        }
    }

    private static Map<String, Object> mapRow(ResultSet rs) throws java.sql.SQLException {
        ResultSetMetaData meta = rs.getMetaData();
        int cols = meta.getColumnCount();
        Map<String, Object> row = new LinkedHashMap<>(cols);
        for (int i = 1; i <= cols; i++) {
            String label = meta.getColumnLabel(i);
            if ("password".equalsIgnoreCase(label) || "remember_token".equalsIgnoreCase(label)) {
                continue;
            }
            row.put(label, rs.getObject(i));
        }
        return row;
    }
}
