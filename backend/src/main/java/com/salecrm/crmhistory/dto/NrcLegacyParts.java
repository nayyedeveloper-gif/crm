package com.salecrm.crmhistory.dto;

import java.util.regex.Pattern;

/**
 * Split NRC for legacy CSV export ({@code nrc_state}, {@code nrc_township_code}, …).
 * Only English-format stored values ({@code 7/YaTaYa(N)133978}) are parsed.
 */
public record NrcLegacyParts(String state, String townshipCode, String type, String number) {

    private static final Pattern ENGLISH = Pattern.compile("^(\\d+)/([^(]+)\\(([A-Za-z])\\)(\\d+)$");

    private static final NrcLegacyParts EMPTY = new NrcLegacyParts("", "", "", "");

    public static NrcLegacyParts fromStoredNrc(String nrc) {
        if (nrc == null || nrc.isBlank()) {
            return EMPTY;
        }
        var matcher = ENGLISH.matcher(nrc.trim());
        if (!matcher.matches()) {
            return EMPTY;
        }
        return new NrcLegacyParts(
                matcher.group(1),
                matcher.group(2).trim(),
                matcher.group(3),
                matcher.group(4)
        );
    }
}
