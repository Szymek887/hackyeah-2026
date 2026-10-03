package com.telecrazy.hackyeah2026backend.auth;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Injects the {@link com.telecrazy.hackyeah2026backend.domain.AppUser} identified by the mock
 * {@value CurrentUserArgumentResolver#USER_ID_HEADER} header into a controller method parameter.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {
}
