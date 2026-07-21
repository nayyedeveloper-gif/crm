package com.salecrm.settings.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.settings.dto.AppSettingsResponse;
import com.salecrm.settings.dto.AppSettingsUpdateRequest;
import com.salecrm.settings.service.AppSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/settings/general")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AppSettingsController {

    private final AppSettingsService appSettingsService;

    @GetMapping
    @PreAuthorize("@perm.canAny('SETTINGS_GENERAL','SETTINGS_APPEARANCE')")
    public ApiResponse<AppSettingsResponse> get() {
        return ApiResponse.ok(appSettingsService.get());
    }

    @GetMapping("/public")
    public ApiResponse<AppSettingsResponse> getPublic() {
        return ApiResponse.ok(appSettingsService.get());
    }

    @GetMapping("/public/invite-image")
    public ResponseEntity<Resource> inviteImage() {
        Resource resource = appSettingsService.loadInviteImage();
        String filename = resource.getFilename() != null ? resource.getFilename() : "invite.jpg";
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .contentType(AppSettingsService.mediaTypeFor(filename))
                .body(resource);
    }

    @GetMapping("/public/mmqr-image")
    public ResponseEntity<Resource> mmqrImage() {
        Resource resource = appSettingsService.loadMmqrImage();
        String filename = resource.getFilename() != null ? resource.getFilename() : "mmqr.jpg";
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .contentType(AppSettingsService.mediaTypeFor(filename))
                .body(resource);
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AppSettingsResponse> update(
            @Valid @RequestBody AppSettingsUpdateRequest request) {
        return ApiResponse.ok(appSettingsService.update(request), "General settings saved");
    }

    @PostMapping(value = "/invite-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AppSettingsResponse> uploadInviteImage(
            @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(appSettingsService.uploadInviteImage(file), "Invite image uploaded");
    }

    @DeleteMapping("/invite-image")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AppSettingsResponse> clearInviteImage() {
        return ApiResponse.ok(appSettingsService.clearInviteImage(), "Invite image reset");
    }

    @PostMapping(value = "/mmqr-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AppSettingsResponse> uploadMmqrImage(
            @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(appSettingsService.uploadMmqrImage(file), "MMQR image uploaded");
    }

    @DeleteMapping("/mmqr-image")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AppSettingsResponse> clearMmqrImage() {
        return ApiResponse.ok(appSettingsService.clearMmqrImage(), "MMQR image cleared");
    }
}
