package com.salecrm.sales.support;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public final class SalesCsvLineParser {

    private SalesCsvLineParser() {
    }

    public static List<String> parseLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            char next = i + 1 < line.length() ? line.charAt(i + 1) : '\0';

            if (ch == '"') {
                if (inQuotes && next == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch == ',' && !inQuotes) {
                result.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        result.add(current.toString());
        return result;
    }

    public static String clean(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }

    public static BigDecimal parseDecimal(String value) {
        String s = clean(value).replace(" ", "");
        if (s.isEmpty()) {
            return null;
        }
        boolean hasComma = s.contains(",");
        boolean hasDot = s.contains(".");
        if (hasComma && hasDot) {
            int lastComma = s.lastIndexOf(',');
            int lastDot = s.lastIndexOf('.');
            s = lastComma > lastDot
                    ? s.replace(".", "").replace(",", ".")
                    : s.replace(",", "");
        } else if (hasComma) {
            String[] parts = s.split(",");
            if (parts.length == 2 && parts[1].length() <= 2) {
                s = parts[0] + "." + parts[1];
            } else {
                s = s.replace(",", "");
            }
        }
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static Integer parseInteger(String value) {
        BigDecimal decimal = parseDecimal(value);
        if (decimal == null) {
            return null;
        }
        return decimal.intValue();
    }
}
