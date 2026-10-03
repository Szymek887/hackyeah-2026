package com.telecrazy.hackyeah2026backend.config;

import com.telecrazy.hackyeah2026backend.auth.CurrentUserArgumentResolver;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppUserRepository userRepository;

    public WebConfig(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentUserArgumentResolver(userRepository));
    }
}
