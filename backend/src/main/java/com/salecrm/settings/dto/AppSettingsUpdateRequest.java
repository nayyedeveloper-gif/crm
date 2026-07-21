package com.salecrm.settings.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AppSettingsUpdateRequest(
        @NotBlank @Size(max = 120) String appName,
        @NotBlank @Size(max = 40) String appVersion,
        @Size(max = 40) String shopWhatsapp,
        @Size(max = 40) String shopViber,
        @Size(max = 120) String shopEyebrow,
        @Size(max = 200) String shopHeadline,
        @Size(max = 1000) String shopSubtitle,
        @Size(max = 80) String shopCtaLabel,
        @Size(max = 120) String shopBrandLine,
        @Size(max = 80) String shopOfferBadge,
        @Size(max = 1000) String shopOfferBlurb,
        @Size(max = 80) String shopOfferCta,
        @Size(max = 80) String shopCollectionCta,
        Boolean invitePopupEnabled,
        @Size(max = 200) String invitePopupTitle,
        @Size(max = 120) String invitePopupDate,
        @Size(max = 1000) String invitePopupSpecial,
        Boolean shopCheckoutEnabled,
        Boolean shopOrdersEnabled,
        Boolean shopMmqrEnabled,
        @Size(max = 1000) String shopMmqrNote,
        Boolean shopFavouritesEnabled,
        @Size(max = 8000) String shopCheckoutTerms,
        @Size(max = 50000) String userAgreement,
        @Size(max = 50000) String privacyPolicy,
        @Size(max = 40) String shopContactPhone,
        @Size(max = 120) String shopContactEmail,
        @Size(max = 2000) String shopContactAddress,
        @Size(max = 200) String shopContactHours
) {
}
