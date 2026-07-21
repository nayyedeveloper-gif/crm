package com.salecrm.security;

import com.salecrm.shopcustomer.ShopCustomerPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(java.util.Base64.getDecoder().decode(properties.secret()));
    }

    public String generateAccessToken(@NonNull UserPrincipal user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(properties.accessTokenTtlMinutes(), ChronoUnit.MINUTES);
        return Jwts.builder()
                .issuer(properties.issuer())
                .subject(user.getUsername())
                .claim("uid", user.getId())
                .claim("role", user.getRole().name())
                .claim("branchId", user.getBranchId())
                .claim("fullName", user.getFullName())
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(@NonNull UserPrincipal user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(properties.refreshTokenTtlDays(), ChronoUnit.DAYS);
        return Jwts.builder()
                .issuer(properties.issuer())
                .subject(user.getUsername())
                .claim("uid", user.getId())
                .claim("type", "refresh")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public @NonNull Claims parse(@NonNull String token) {
        return Jwts.parser()
                .verifyWith(key)
                .requireIssuer(properties.issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String generateShopAccessToken(@NonNull ShopCustomerPrincipal customer) {
        Instant now = Instant.now();
        Instant expiry = now.plus(properties.accessTokenTtlMinutes(), ChronoUnit.MINUTES);
        return Jwts.builder()
                .issuer(properties.issuer())
                .subject(customer.getUsername())
                .claim("cid", customer.id())
                .claim("email", customer.email())
                .claim("fullName", customer.fullName())
                .claim("profileComplete", customer.profileComplete())
                .claim("type", "shop_access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public boolean isShopAccessToken(Claims claims) {
        return "shop_access".equals(claims.get("type", String.class));
    }

    public long accessTokenTtlSeconds() {
        return properties.accessTokenTtlMinutes() * 60;
    }

    public boolean isAccessToken(Claims claims) {
        return "access".equals(claims.get("type", String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return "refresh".equals(claims.get("type", String.class));
    }

    public Map<String, Object> claimsAsMap(Claims claims) {
        return claims;
    }
}
