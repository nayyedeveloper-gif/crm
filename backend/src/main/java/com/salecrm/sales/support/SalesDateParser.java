package com.salecrm.sales.support;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

public final class SalesDateParser {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    private SalesDateParser() {
    }

    public static LocalDate parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String clean = raw.trim();

        String[] dotParts = clean.split("\\.");
        if (dotParts.length == 3) {
            try {
                int d = Integer.parseInt(dotParts[0]);
                int m = Integer.parseInt(dotParts[1]);
                int y = Integer.parseInt(dotParts[2]);
                if (y > 1000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                    return LocalDate.of(y, m, d);
                }
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }

        try {
            return LocalDate.parse(clean, ISO);
        } catch (DateTimeParseException ignored) {
            // fall through
        }

        String[] parts = clean.split("[/\\-\\s]+");
        if (parts.length >= 3) {
            try {
                int p1 = Integer.parseInt(parts[0]);
                int p2 = Integer.parseInt(parts[1]);
                int p3 = Integer.parseInt(parts[2]);
                if (p3 > 1000 && p1 > 12 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
                    return LocalDate.of(p3, p2, p1);
                }
                if (p1 > 1000 && p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) {
                    return LocalDate.of(p1, p2, p3);
                }
                if (p3 > 1000 && p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
                    return LocalDate.of(p3, p1, p2);
                }
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }

        try {
            return LocalDate.parse(clean, DateTimeFormatter.ofPattern("M/d/yyyy", Locale.US));
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    public static LocalDate fromTimestamp(String timestamp) {
        if (timestamp == null || timestamp.isBlank()) {
            return null;
        }
        String datePart = timestamp.trim().split("\\s+")[0];
        return parse(datePart);
    }
}
