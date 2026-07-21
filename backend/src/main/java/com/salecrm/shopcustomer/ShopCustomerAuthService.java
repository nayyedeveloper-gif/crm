package com.salecrm.shopcustomer;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.security.JwtService;
import com.salecrm.shopcustomer.dto.GoogleLoginRequest;
import com.salecrm.shopcustomer.dto.ShopAuthResponse;
import com.salecrm.shopcustomer.dto.ShopCustomerProfileRequest;
import com.salecrm.shopcustomer.dto.ShopCustomerResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class ShopCustomerAuthService {

    private final ShopCustomerRepository customerRepository;
    private final JwtService jwtService;

    @Value("${app.shop.google-client-id:}")
    private String googleClientId;

    @Transactional
    public ShopAuthResponse loginWithGoogle(GoogleLoginRequest request) {
        if (!StringUtils.hasText(googleClientId)) {
            throw new BusinessException(
                    "Google Sign-In is not configured (set SHOP_GOOGLE_CLIENT_ID)",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }
        GoogleIdToken.Payload payload = verifyGoogleToken(request.idToken());
        String sub = payload.getSubject();
        String email = payload.getEmail();
        if (!StringUtils.hasText(email)) {
            throw new BusinessException("Google account has no email", HttpStatus.BAD_REQUEST);
        }

        ShopCustomer customer = customerRepository.findByGoogleSub(sub).orElseGet(() -> {
            ShopCustomer created = new ShopCustomer();
            created.setGoogleSub(sub);
            created.setEmail(email.trim().toLowerCase());
            created.setEmailVerified(Boolean.TRUE.equals(payload.getEmailVerified()));
            created.setFullName((String) payload.get("name"));
            created.setAvatarUrl((String) payload.get("picture"));
            created.setProfileComplete(false);
            created.setActive(true);
            created.setCustomerTier(ShopCustomerTier.CUSTOMER);
            created.setTrusted(false);
            return customerRepository.save(created);
        });

        if (!customer.isActive()) {
            throw new BusinessException("Account is disabled", HttpStatus.FORBIDDEN);
        }

        // Refresh avatar / email verified from Google occasionally
        customer.setEmailVerified(Boolean.TRUE.equals(payload.getEmailVerified()));
        String picture = (String) payload.get("picture");
        if (StringUtils.hasText(picture)) {
            customer.setAvatarUrl(picture);
        }
        if (!StringUtils.hasText(customer.getFullName()) && payload.get("name") != null) {
            customer.setFullName((String) payload.get("name"));
        }
        customerRepository.save(customer);

        String token = jwtService.generateShopAccessToken(ShopCustomerPrincipal.from(customer));
        return new ShopAuthResponse(
                token,
                jwtService.accessTokenTtlSeconds(),
                ShopCustomerResponse.from(customer),
                !customer.isProfileComplete()
        );
    }

    @Transactional(readOnly = true)
    public ShopCustomerResponse me(Long customerId) {
        return ShopCustomerResponse.from(require(customerId));
    }

    @Transactional
    public ShopCustomerResponse updateProfile(Long customerId, ShopCustomerProfileRequest req) {
        ShopCustomer c = require(customerId);
        if (!StringUtils.hasText(req.fullName())) {
            throw new BusinessException("Name is required");
        }
        if (!StringUtils.hasText(req.phone())) {
            throw new BusinessException("Phone number is required");
        }
        if (req.birthday() == null) {
            throw new BusinessException("Birthday is required");
        }
        if (!StringUtils.hasText(req.address())) {
            throw new BusinessException("Address is required");
        }
        c.setFullName(req.fullName().trim());
        c.setPhone(req.phone().trim());
        c.setBirthday(req.birthday());
        c.setAddress(req.address().trim());
        if (req.avatarUrl() != null) {
            String avatar = req.avatarUrl().trim();
            c.setAvatarUrl(avatar.isEmpty() ? null : avatar);
        }
        c.setProfileComplete(true);
        return ShopCustomerResponse.from(customerRepository.save(c));
    }

    private ShopCustomer require(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShopCustomer", id));
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idToken) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                throw new BusinessException("Invalid Google token", HttpStatus.UNAUTHORIZED);
            }
            return token.getPayload();
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Google token verify failed: {}", ex.getMessage());
            throw new BusinessException("Google Sign-In failed", HttpStatus.UNAUTHORIZED);
        }
    }
}
