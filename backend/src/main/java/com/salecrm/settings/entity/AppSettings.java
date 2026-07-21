package com.salecrm.settings.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppSettings extends BaseEntity {

    @Id
    private Long id;

    @Column(name = "app_name", nullable = false, length = 120)
    @Builder.Default
    private String appName = "Sale CRM";

    @Column(name = "app_version", nullable = false, length = 40)
    @Builder.Default
    private String appVersion = "1.0.0";

    /** Shop inquiry WhatsApp number (digits, optional country code). */
    @Column(name = "shop_whatsapp", length = 40)
    private String shopWhatsapp;

    /** Shop inquiry Viber number (digits, optional country code). */
    @Column(name = "shop_viber", length = 40)
    private String shopViber;

    /** Storefront eyebrow above the hero title. */
    @Column(name = "shop_eyebrow", length = 120)
    private String shopEyebrow;

    /** Storefront hero title (blank = use app name). */
    @Column(name = "shop_headline", length = 200)
    private String shopHeadline;

    @Column(name = "shop_subtitle", columnDefinition = "TEXT")
    private String shopSubtitle;

    @Column(name = "shop_cta_label", length = 80)
    private String shopCtaLabel;

    /** Small brand line under logo / in footer. */
    @Column(name = "shop_brand_line", length = 120)
    private String shopBrandLine;

    @Column(name = "shop_offer_badge", length = 80)
    private String shopOfferBadge;

    @Column(name = "shop_offer_blurb", columnDefinition = "TEXT")
    private String shopOfferBlurb;

    @Column(name = "shop_offer_cta", length = 80)
    private String shopOfferCta;

    @Column(name = "shop_collection_cta", length = 80)
    private String shopCollectionCta;

    @Column(name = "invite_popup_enabled", nullable = false)
    @Builder.Default
    private boolean invitePopupEnabled = true;

    @Column(name = "invite_popup_title", length = 200)
    private String invitePopupTitle;

    @Column(name = "invite_popup_date", length = 120)
    private String invitePopupDate;

    @Column(name = "invite_popup_special", columnDefinition = "TEXT")
    private String invitePopupSpecial;

    /** Relative path under settings image dir; null = frontend default invite art. */
    @Column(name = "invite_popup_image", length = 500)
    private String invitePopupImage;

    @Column(name = "shop_checkout_enabled", nullable = false)
    @Builder.Default
    private boolean shopCheckoutEnabled = false;

    @Column(name = "shop_orders_enabled", nullable = false)
    @Builder.Default
    private boolean shopOrdersEnabled = false;

    @Column(name = "shop_mmqr_enabled", nullable = false)
    @Builder.Default
    private boolean shopMmqrEnabled = false;

    @Column(name = "shop_mmqr_image", length = 500)
    private String shopMmqrImage;

    @Column(name = "shop_mmqr_note", columnDefinition = "TEXT")
    private String shopMmqrNote;

    @Column(name = "shop_favourites_enabled", nullable = false)
    @Builder.Default
    private boolean shopFavouritesEnabled = true;

    @Column(name = "shop_checkout_terms", columnDefinition = "TEXT")
    private String shopCheckoutTerms;

    @Column(name = "user_agreement", columnDefinition = "TEXT")
    private String userAgreement;

    @Column(name = "privacy_policy", columnDefinition = "TEXT")
    private String privacyPolicy;

    @Column(name = "shop_contact_phone", length = 40)
    private String shopContactPhone;

    @Column(name = "shop_contact_email", length = 120)
    private String shopContactEmail;

    @Column(name = "shop_contact_address", columnDefinition = "TEXT")
    private String shopContactAddress;

    @Column(name = "shop_contact_hours", length = 200)
    private String shopContactHours;
}
