package com.telecrazy.hackyeah2026backend.config;

import com.telecrazy.hackyeah2026backend.auth.CurrentUserArgumentResolver;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@EnableConfigurationProperties(CorsProperties.class)
public class WebConfig implements WebMvcConfigurer {

    private final AppUserRepository userRepository;
    private final CorsProperties corsProperties;

    public WebConfig(AppUserRepository userRepository, CorsProperties corsProperties) {
        this.userRepository = userRepository;
        this.corsProperties = corsProperties;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentUserArgumentResolver(userRepository));
    }

    /**
     * Browser clients (Expo web, city dashboard) run on another origin than the API. Native apps
     * are not subject to CORS. No cookies are used (mock auth is a header), so no credentials.
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(corsProperties.allowedOriginPatterns().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT")
                .allowedHeaders(
                        HttpHeaders.CONTENT_TYPE,
                        HttpHeaders.ACCEPT,
                        CurrentUserArgumentResolver.USER_ID_HEADER
                )
                .exposedHeaders(HttpHeaders.LOCATION)
                .maxAge(3600);
    }
}
