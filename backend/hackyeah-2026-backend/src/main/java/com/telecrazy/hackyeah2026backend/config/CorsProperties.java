package com.telecrazy.hackyeah2026backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * @param allowedOriginPatterns origins allowed to call {@code /api/**} from a browser (Expo web, dashboard),
 *                              Spring origin patterns such as {@code http://localhost:*}
 */
@ConfigurationProperties("app.cors")
public record CorsProperties(List<String> allowedOriginPatterns) {

    public CorsProperties {
        allowedOriginPatterns = allowedOriginPatterns == null ? List.of() : List.copyOf(allowedOriginPatterns);
    }
}
