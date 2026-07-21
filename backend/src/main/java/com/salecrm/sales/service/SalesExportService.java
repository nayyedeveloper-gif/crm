package com.salecrm.sales.service;

import com.salecrm.sales.entity.SalesTransaction;
import com.salecrm.sales.repository.SalesTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class SalesExportService {

    private static final DateTimeFormatter SHEET_DATE =
            DateTimeFormatter.ofPattern("M/d/yyyy", Locale.US);

    private static final String[] HEADERS = {
            "Date", "Branch အမည်", "Items Code", "Item Main Group", "Item Category",
            "Qty", "Gram", "Voucher Amount", "ဝယ်သူ အမည်", "Contact Number", "Region",
            "Township", "Type", "အရောင်းသမားအမည်", "အကြောင်းအရာ", "ပဲရည်", "Remark"
    };

    private final SalesTransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public void exportTransactions(OutputStream outputStream) throws IOException {
        try (OutputStreamWriter writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);
             CSVPrinter printer = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setHeader(HEADERS).build())) {

            writer.write('\ufeff');

            int page = 0;
            final int size = 1000;
            while (true) {
                var batch = transactionRepository.findAll(
                        PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"))
                );
                if (batch.isEmpty()) {
                    break;
                }
                for (SalesTransaction row : batch) {
                    printer.printRecord(
                            row.getSaleDate() != null ? SHEET_DATE.format(row.getSaleDate()) : "",
                            nullToEmpty(row.getBranchName()),
                            nullToEmpty(row.getItemsCode()),
                            nullToEmpty(row.getItemMainGroup()),
                            nullToEmpty(row.getItemCategory()),
                            formatDecimal(row.getQty()),
                            formatDecimal(row.getGram()),
                            formatDecimal(row.getAmount()),
                            nullToEmpty(row.getBuyerName()),
                            nullToEmpty(row.getContactNumber()),
                            nullToEmpty(row.getRegion()),
                            nullToEmpty(row.getTownship()),
                            nullToEmpty(row.getCustomerType()),
                            nullToEmpty(row.getSalesStaff()),
                            nullToEmpty(row.getReason()),
                            nullToEmpty(row.getPurity()),
                            nullToEmpty(row.getSpecialEvent())
                    );
                }
                if (!batch.hasNext()) {
                    break;
                }
                page++;
            }
            printer.flush();
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String formatDecimal(java.math.BigDecimal value) {
        if (value == null) {
            return "";
        }
        return value.stripTrailingZeros().toPlainString();
    }
}
