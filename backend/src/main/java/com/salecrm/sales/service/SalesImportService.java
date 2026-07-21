package com.salecrm.sales.service;

import com.salecrm.sales.dto.SalesImportResult;
import com.salecrm.sales.entity.SalesMonthlyTarget;
import com.salecrm.sales.entity.SalesTransaction;
import com.salecrm.sales.repository.SalesMonthlyTargetRepository;
import com.salecrm.sales.repository.SalesTransactionRepository;
import com.salecrm.sales.support.SalesCsvLineParser;
import com.salecrm.sales.support.SalesDateParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class SalesImportService {

    private static final int BATCH_SIZE = 500;

    private final SalesTransactionRepository transactionRepository;
    private final SalesMonthlyTargetRepository targetRepository;

    @Transactional
    public SalesImportResult importTransactions(MultipartFile file, boolean replaceAll) {
        if (file == null || file.isEmpty()) {
            return new SalesImportResult(0, 0, "No file uploaded");
        }

        if (replaceAll) {
            transactionRepository.deleteAllRows();
            transactionRepository.flush();
        }

        int imported = 0;
        int skipped = 0;
        List<SalesTransaction> batch = new ArrayList<>(BATCH_SIZE);

        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setTrim(true)
                .build();

        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = new CSVParser(reader, format)) {

            Map<String, Integer> headerIndex = buildHeaderIndex(parser.getHeaderMap());
            for (CSVRecord record : parser) {
                List<String> cols = new ArrayList<>(record.size());
                for (int i = 0; i < record.size(); i++) {
                    cols.add(record.get(i));
                }
                SalesTransaction row = mapTransactionRow(cols, headerIndex);
                if (!isValidTransaction(row)) {
                    skipped++;
                    continue;
                }
                batch.add(row);
                if (batch.size() >= BATCH_SIZE) {
                    transactionRepository.saveAll(batch);
                    imported += batch.size();
                    batch.clear();
                }
            }
            if (!batch.isEmpty()) {
                transactionRepository.saveAll(batch);
                imported += batch.size();
            }
        } catch (Exception ex) {
            log.error("Failed to import sales transactions", ex);
            throw new IllegalArgumentException("Failed to import transactions: " + ex.getMessage());
        }

        return new SalesImportResult(imported, skipped, "Imported " + imported + " transactions");
    }

    @Transactional
    public SalesImportResult importTargets(MultipartFile file, String monthLabel, boolean replaceMonth) {
        if (file == null || file.isEmpty()) {
            return new SalesImportResult(0, 0, "No file uploaded");
        }
        if (!StringUtils.hasText(monthLabel)) {
            throw new IllegalArgumentException("month is required");
        }

        if (replaceMonth) {
            targetRepository.deleteByMonthLabel(monthLabel.trim());
            targetRepository.flush();
        }

        int imported = 0;
        int skipped = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            reader.readLine(); // category headers
            reader.readLine(); // qty/amount sub-headers

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                List<String> cols = SalesCsvLineParser.parseLine(line);
                if (cols.size() < 11) {
                    skipped++;
                    continue;
                }
                String shop = SalesCsvLineParser.clean(cols.get(0));
                if (!StringUtils.hasText(shop)) {
                    skipped++;
                    continue;
                }

                boolean companyTotal = "total".equalsIgnoreCase(shop);
                SalesMonthlyTarget target = SalesMonthlyTarget.builder()
                        .monthLabel(monthLabel.trim())
                        .shopName(shop)
                        .companyTotal(companyTotal)
                        .diamondQty(SalesCsvLineParser.parseDecimal(cols.get(1)))
                        .diamondAmount(SalesCsvLineParser.parseDecimal(cols.get(2)))
                        .ptQty(SalesCsvLineParser.parseDecimal(cols.get(3)))
                        .ptAmount(SalesCsvLineParser.parseDecimal(cols.get(4)))
                        .gold15Qty(SalesCsvLineParser.parseDecimal(cols.get(5)))
                        .gold15Amount(SalesCsvLineParser.parseDecimal(cols.get(6)))
                        .gold16Qty(SalesCsvLineParser.parseDecimal(cols.get(7)))
                        .gold16Amount(SalesCsvLineParser.parseDecimal(cols.get(8)))
                        .totalQty(SalesCsvLineParser.parseDecimal(cols.get(9)))
                        .totalAmount(SalesCsvLineParser.parseDecimal(cols.get(10)))
                        .build();
                targetRepository.save(target);
                imported++;
            }
        } catch (Exception ex) {
            log.error("Failed to import sales targets", ex);
            throw new IllegalArgumentException("Failed to import targets: " + ex.getMessage());
        }

        return new SalesImportResult(imported, skipped, "Imported " + imported + " target rows");
    }

    private static Map<String, Integer> buildHeaderIndex(Map<String, Integer> headerMap) {
        Map<String, Integer> index = new HashMap<>();
        for (Map.Entry<String, Integer> entry : headerMap.entrySet()) {
            String raw = entry.getKey();
            String normalized = normalizeHeader(raw);
            index.put(normalized, entry.getValue());
            if (StringUtils.hasText(raw)) {
                index.putIfAbsent(raw.trim(), entry.getValue());
            }
        }
        return index;
    }

    private static String normalizeHeader(String header) {
        if (header == null) {
            return "";
        }
        return header.replace('\n', ' ').replace('\r', ' ').trim().replaceAll("\\s+", " ");
    }

    private static String cell(List<String> cols, Map<String, Integer> headerIndex, String... keys) {
        for (String key : keys) {
            Integer idx = headerIndex.get(key);
            if (idx == null) {
                idx = headerIndex.get(normalizeHeader(key));
            }
            if (idx != null && idx < cols.size()) {
                String value = SalesCsvLineParser.clean(cols.get(idx));
                if (!value.isEmpty()) {
                    return value;
                }
            }
        }
        return null;
    }

    private static SalesTransaction mapTransactionRow(List<String> cols, Map<String, Integer> headerIndex) {
        String timestamp = cell(cols, headerIndex, "Timestamp");
        String dateRaw = cell(cols, headerIndex, "Date");
        LocalDate saleDate = SalesDateParser.parse(dateRaw);
        if (saleDate == null) {
            saleDate = SalesDateParser.fromTimestamp(timestamp);
        }

        String branch = Optional.ofNullable(cell(cols, headerIndex, "Branch အမည်", "Branch"))
                .filter(StringUtils::hasText)
                .orElse("Unknown");

        return SalesTransaction.builder()
                .transactionTs(timestamp)
                .saleDate(saleDate)
                .branchName(branch)
                .reason(cell(cols, headerIndex, "အကြောင်းအရာ"))
                .salesStaff(cell(cols, headerIndex, "အရောင်းသမားအမည်"))
                .customerService(cell(cols, headerIndex, "Customer Service အမည်"))
                .buyerName(cell(cols, headerIndex, "ဝယ်သူ အမည်"))
                .contactNumber(cell(cols, headerIndex, "Contact Number"))
                .township(cell(cols, headerIndex, "Township"))
                .region(cell(cols, headerIndex, "Region"))
                .customerType(cell(cols, headerIndex, "Customer Type(Old/New)", "Customer Type", "Type"))
                .groupSize(SalesCsvLineParser.parseInteger(cell(cols, headerIndex, "တဖွဲ့တွင်ပါဝင်သောလူဦးရေ")))
                .qty(SalesCsvLineParser.parseDecimal(cell(cols, headerIndex, "QTY", "Qty")))
                .gram(SalesCsvLineParser.parseDecimal(cell(cols, headerIndex, "Gram")))
                .amount(SalesCsvLineParser.parseDecimal(cell(cols, headerIndex, "Voucher Amount", "Amount")))
                .itemCategory(cell(cols, headerIndex, "Item Category"))
                .itemMainGroup(cell(cols, headerIndex, "Item Main Group"))
                .itemsCode(cell(cols, headerIndex, "Items Code"))
                .purity(cell(cols, headerIndex, "ပဲရည်"))
                .specialEvent(cell(cols, headerIndex, "ထူးခြားဖြစ်စဉ်", "Remark"))
                .build();
    }

    private static boolean isValidTransaction(SalesTransaction row) {
        boolean hasBranch = StringUtils.hasText(row.getBranchName()) && !"Unknown".equals(row.getBranchName());
        return hasBranch || row.getSaleDate() != null || StringUtils.hasText(row.getTransactionTs());
    }
}
