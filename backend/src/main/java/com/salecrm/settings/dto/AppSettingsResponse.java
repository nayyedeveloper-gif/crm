package com.salecrm.settings.dto;

import com.salecrm.settings.entity.AppSettings;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.util.StringUtils;

public record AppSettingsResponse(
        @NonNull String appName,
        @NonNull String appVersion,
        @Nullable String shopWhatsapp,
        @Nullable String shopViber,
        @Nullable String shopEyebrow,
        @Nullable String shopHeadline,
        @Nullable String shopSubtitle,
        @Nullable String shopCtaLabel,
        @Nullable String shopBrandLine,
        @Nullable String shopOfferBadge,
        @Nullable String shopOfferBlurb,
        @Nullable String shopOfferCta,
        @Nullable String shopCollectionCta,
        boolean invitePopupEnabled,
        @Nullable String invitePopupTitle,
        @Nullable String invitePopupDate,
        @Nullable String invitePopupSpecial,
        @Nullable String invitePopupImageUrl,
        boolean shopCheckoutEnabled,
        boolean shopOrdersEnabled,
        boolean shopMmqrEnabled,
        @Nullable String shopMmqrImageUrl,
        @Nullable String shopMmqrNote,
        boolean shopFavouritesEnabled,
        @Nullable String shopCheckoutTerms,
        @Nullable String userAgreement,
        @Nullable String privacyPolicy,
        @Nullable String shopContactPhone,
        @Nullable String shopContactEmail,
        @Nullable String shopContactAddress,
        @Nullable String shopContactHours,
        @NonNull String timezone,
        @NonNull String database
) {
    public static AppSettingsResponse from(@NonNull AppSettings s) {
        String appName = s.getAppName();
        String appVersion = s.getAppVersion();
        if (appName == null || appVersion == null) {
            throw new IllegalStateException("App settings missing app name or version");
        }
        String inviteUrl = StringUtils.hasText(s.getInvitePopupImage())
                ? "/settings/general/public/invite-image"
                : null;
        String mmqrUrl = StringUtils.hasText(s.getShopMmqrImage())
                ? "/settings/general/public/mmqr-image"
                : null;
        return new AppSettingsResponse(
                appName,
                appVersion,
                s.getShopWhatsapp(),
                s.getShopViber(),
                s.getShopEyebrow(),
                s.getShopHeadline(),
                s.getShopSubtitle(),
                s.getShopCtaLabel(),
                s.getShopBrandLine(),
                s.getShopOfferBadge(),
                s.getShopOfferBlurb(),
                s.getShopOfferCta(),
                s.getShopCollectionCta(),
                s.isInvitePopupEnabled(),
                s.getInvitePopupTitle(),
                s.getInvitePopupDate(),
                s.getInvitePopupSpecial(),
                inviteUrl,
                s.isShopCheckoutEnabled(),
                s.isShopOrdersEnabled(),
                s.isShopMmqrEnabled(),
                mmqrUrl,
                s.getShopMmqrNote(),
                s.isShopFavouritesEnabled(),
                s.getShopCheckoutTerms(),
                s.getUserAgreement(),
                s.getPrivacyPolicy(),
                s.getShopContactPhone(),
                s.getShopContactEmail(),
                s.getShopContactAddress(),
                s.getShopContactHours(),
                "Asia/Yangon (UTC+06:30)",
                "PostgreSQL"
        );
    }
}
