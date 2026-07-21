package com.salecrm.settings.service;

import com.salecrm.common.exception.BusinessException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.settings.dto.AppSettingsResponse;
import com.salecrm.settings.dto.AppSettingsUpdateRequest;
import com.salecrm.settings.entity.AppSettings;
import com.salecrm.settings.repository.AppSettingsRepository;
import com.salecrm.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AppSettingsService {

    private static final Set<String> ALLOWED_IMAGES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif");
    private static final long MAX_IMAGE_BYTES = 8L * 1024 * 1024;

    private final AppSettingsRepository repository;
    private final AuditLogService auditLogService;

    @Value("${app.settings.image-dir:./data/settings}")
    private String settingsImageDir;

    @Transactional(readOnly = true)
    public AppSettingsResponse get() {
        return toResponse(require());
    }

    @Transactional
    public AppSettingsResponse update(AppSettingsUpdateRequest request) {
        AppSettings settings = require();
        String before = settings.getAppName() + " @ " + settings.getAppVersion();
        settings.setAppName(request.appName().trim());
        settings.setAppVersion(request.appVersion().trim());
        settings.setShopWhatsapp(digitsOnlyOrNull(request.shopWhatsapp()));
        settings.setShopViber(digitsOnlyOrNull(request.shopViber()));
        settings.setShopEyebrow(trimOrNull(request.shopEyebrow()));
        settings.setShopHeadline(trimOrNull(request.shopHeadline()));
        settings.setShopSubtitle(trimOrNull(request.shopSubtitle()));
        settings.setShopCtaLabel(trimOrNull(request.shopCtaLabel()));
        settings.setShopBrandLine(trimOrNull(request.shopBrandLine()));
        settings.setShopOfferBadge(trimOrNull(request.shopOfferBadge()));
        settings.setShopOfferBlurb(trimOrNull(request.shopOfferBlurb()));
        settings.setShopOfferCta(trimOrNull(request.shopOfferCta()));
        settings.setShopCollectionCta(trimOrNull(request.shopCollectionCta()));
        if (request.invitePopupEnabled() != null) {
            settings.setInvitePopupEnabled(request.invitePopupEnabled());
        }
        settings.setInvitePopupTitle(trimOrNull(request.invitePopupTitle()));
        settings.setInvitePopupDate(trimOrNull(request.invitePopupDate()));
        settings.setInvitePopupSpecial(trimOrNull(request.invitePopupSpecial()));
        if (request.shopCheckoutEnabled() != null) {
            settings.setShopCheckoutEnabled(request.shopCheckoutEnabled());
        }
        if (request.shopOrdersEnabled() != null) {
            settings.setShopOrdersEnabled(request.shopOrdersEnabled());
        }
        if (request.shopMmqrEnabled() != null) {
            settings.setShopMmqrEnabled(request.shopMmqrEnabled());
        }
        if (request.shopMmqrNote() != null) {
            settings.setShopMmqrNote(trimOrNull(request.shopMmqrNote()));
        }
        if (request.shopFavouritesEnabled() != null) {
            settings.setShopFavouritesEnabled(request.shopFavouritesEnabled());
        }
        if (request.shopCheckoutTerms() != null) {
            settings.setShopCheckoutTerms(trimOrNull(request.shopCheckoutTerms()));
        }
        if (request.userAgreement() != null) {
            settings.setUserAgreement(trimOrNull(request.userAgreement()));
        }
        if (request.privacyPolicy() != null) {
            settings.setPrivacyPolicy(trimOrNull(request.privacyPolicy()));
        }
        if (request.shopContactPhone() != null) {
            settings.setShopContactPhone(digitsOnlyOrNull(request.shopContactPhone()));
        }
        if (request.shopContactEmail() != null) {
            settings.setShopContactEmail(trimOrNull(request.shopContactEmail()));
        }
        if (request.shopContactAddress() != null) {
            settings.setShopContactAddress(trimOrNull(request.shopContactAddress()));
        }
        if (request.shopContactHours() != null) {
            settings.setShopContactHours(trimOrNull(request.shopContactHours()));
        }
        AppSettings saved = repository.save(settings);
        String after = saved.getAppName() + " @ " + saved.getAppVersion();
        auditLogService.change("GENERAL", "UPDATE", "Application settings updated",
                before + " → " + after);
        auditLogService.system("INFO", "app-settings", "App settings updated to " + after, null);
        return toResponse(saved);
    }

    @Transactional
    public AppSettingsResponse uploadInviteImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Image is required");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new BusinessException("Image too large (max 8MB)", HttpStatus.BAD_REQUEST);
        }
        String contentType = file.getContentType() != null
                ? file.getContentType().toLowerCase(Locale.ROOT)
                : "";
        if (!ALLOWED_IMAGES.contains(contentType)) {
            throw new BusinessException("Only JPEG, PNG, WebP, or GIF images are allowed");
        }

        AppSettings settings = require();
        deleteInviteImageQuietly(settings.getInvitePopupImage());

        String ext = extensionFor(contentType, file.getOriginalFilename());
        String filename = "invite-" + UUID.randomUUID().toString().substring(0, 8) + ext;
        try {
            Path dir = Path.of(settingsImageDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(filename).normalize();
            if (!target.startsWith(dir)) {
                throw new BusinessException("Invalid image path");
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target);
            }
            settings.setInvitePopupImage(filename);
            AppSettings saved = repository.save(settings);
            auditLogService.change("GENERAL", "UPDATE", "Invite popup image updated", filename);
            return toResponse(saved);
        } catch (IOException ex) {
            log.error("Failed to store invite image", ex);
            throw new BusinessException("Failed to store image", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional
    public AppSettingsResponse clearInviteImage() {
        AppSettings settings = require();
        deleteInviteImageQuietly(settings.getInvitePopupImage());
        settings.setInvitePopupImage(null);
        AppSettings saved = repository.save(settings);
        auditLogService.change("GENERAL", "UPDATE", "Invite popup image reset to default", null);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Resource loadInviteImage() {
        AppSettings settings = require();
        String relative = settings.getInvitePopupImage();
        if (!StringUtils.hasText(relative)) {
            throw new BusinessException("Invite image not found", HttpStatus.NOT_FOUND);
        }
        Path root = Path.of(settingsImageDir).toAbsolutePath().normalize();
        Path path = root.resolve(relative).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new BusinessException("Invite image not found", HttpStatus.NOT_FOUND);
        }
        return new FileSystemResource(path);
    }

    @Transactional
    public AppSettingsResponse uploadMmqrImage(MultipartFile file) {
        String filename = storeImageFile(file, "mmqr-");
        AppSettings settings = require();
        deleteFileQuietly(settings.getShopMmqrImage());
        settings.setShopMmqrImage(filename);
        AppSettings saved = repository.save(settings);
        auditLogService.change("GENERAL", "UPDATE", "MMQR image updated", filename);
        return toResponse(saved);
    }

    @Transactional
    public AppSettingsResponse clearMmqrImage() {
        AppSettings settings = require();
        deleteFileQuietly(settings.getShopMmqrImage());
        settings.setShopMmqrImage(null);
        AppSettings saved = repository.save(settings);
        auditLogService.change("GENERAL", "UPDATE", "MMQR image cleared", null);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Resource loadMmqrImage() {
        AppSettings settings = require();
        String relative = settings.getShopMmqrImage();
        if (!StringUtils.hasText(relative)) {
            throw new BusinessException("MMQR image not found", HttpStatus.NOT_FOUND);
        }
        return loadSettingImage(relative);
    }

    public static MediaType mediaTypeFor(String filename) {
        String lower = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return new MediaType("image", "webp");
        }
        if (lower.endsWith(".gif")) {
            return MediaType.IMAGE_GIF;
        }
        return MediaType.IMAGE_JPEG;
    }

    private String storeImageFile(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Image is required");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new BusinessException("Image too large (max 8MB)", HttpStatus.BAD_REQUEST);
        }
        String contentType = file.getContentType() != null
                ? file.getContentType().toLowerCase(Locale.ROOT)
                : "";
        if (!ALLOWED_IMAGES.contains(contentType)) {
            throw new BusinessException("Only JPEG, PNG, WebP, or GIF images are allowed");
        }
        String ext = extensionFor(contentType, file.getOriginalFilename());
        String filename = prefix + UUID.randomUUID().toString().substring(0, 8) + ext;
        try {
            Path dir = Path.of(settingsImageDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(filename).normalize();
            if (!target.startsWith(dir)) {
                throw new BusinessException("Invalid image path");
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target);
            }
            return filename;
        } catch (IOException ex) {
            log.error("Failed to store settings image", ex);
            throw new BusinessException("Failed to store image", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Resource loadSettingImage(String relative) {
        Path root = Path.of(settingsImageDir).toAbsolutePath().normalize();
        Path path = root.resolve(relative).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new BusinessException("Image not found", HttpStatus.NOT_FOUND);
        }
        return new FileSystemResource(path);
    }

    private void deleteFileQuietly(String relative) {
        if (!StringUtils.hasText(relative)) return;
        try {
            Path root = Path.of(settingsImageDir).toAbsolutePath().normalize();
            Path path = root.resolve(relative).normalize();
            if (path.startsWith(root)) {
                Files.deleteIfExists(path);
            }
        } catch (Exception ignored) {
            // best-effort
        }
    }

    private void deleteInviteImageQuietly(String relative) {
        deleteFileQuietly(relative);
    }

    private AppSettings require() {
        return repository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("AppSettings", 1));
    }

    private AppSettingsResponse toResponse(AppSettings s) {
        return AppSettingsResponse.from(s);
    }

    private static String digitsOnlyOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().replaceAll("\\s+", "");
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private static String extensionFor(String contentType, String original) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> {
                if (original != null && original.toLowerCase(Locale.ROOT).endsWith(".png")) yield ".png";
                yield ".jpg";
            }
        };
    }
}
