package com.salecrm.crmhistory.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

/**
 * Invitation / call outcome from the legacy Laravel CRM ({@code invite_status}).
 */
public enum InviteStatus {
    ATTEND,
    NOT_ATTEND,
    UNREACHABLE,
    NOT_ANSWERED,
    PHONE_OFF;

    public static InviteStatus fromLegacy(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return switch (raw.trim().toLowerCase()) {
            case "attend" -> ATTEND;
            case "not_attend" -> NOT_ATTEND;
            case "unreachable" -> UNREACHABLE;
            case "not_answered" -> NOT_ANSWERED;
            case "phone_off" -> PHONE_OFF;
            default -> null;
        };
    }

    public ActionType toActionType() {
        return switch (this) {
            case ATTEND -> ActionType.PURCHASE;
            case NOT_ATTEND -> ActionType.FOLLOW_UP;
            case UNREACHABLE, NOT_ANSWERED, PHONE_OFF -> ActionType.INQUIRY;
        };
    }

    /** Legacy Laravel / {@code crm_histories.csv} {@code invite_status} values. */
    public String toLegacyValue() {
        return switch (this) {
            case ATTEND -> "attend";
            case NOT_ATTEND -> "not_attend";
            case UNREACHABLE -> "unreachable";
            case NOT_ANSWERED -> "not_answered";
            case PHONE_OFF -> "phone_off";
        };
    }

    /** Accepts enum name ({@code ATTEND}) or legacy snake_case ({@code phone_off}). */
    @JsonCreator
    public static InviteStatus parseQueryParam(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        try {
            return InviteStatus.valueOf(trimmed.toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return fromLegacy(trimmed);
        }
    }
}
