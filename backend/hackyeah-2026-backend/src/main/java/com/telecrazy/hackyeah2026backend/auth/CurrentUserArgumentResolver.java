package com.telecrazy.hackyeah2026backend.auth;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.exception.UnauthorizedException;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    public static final String USER_ID_HEADER = "X-User-Id";

    private final AppUserRepository userRepository;

    public CurrentUserArgumentResolver(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
                && AppUser.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public AppUser resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory
    ) {
        String header = webRequest.getHeader(USER_ID_HEADER);
        if (header == null || header.isBlank()) {
            throw new UnauthorizedException("Missing " + USER_ID_HEADER + " header");
        }

        long userId;
        try {
            userId = Long.parseLong(header.trim());
        } catch (NumberFormatException exception) {
            throw new UnauthorizedException(USER_ID_HEADER + " must be a numeric user id");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Unknown user " + userId));
    }
}
