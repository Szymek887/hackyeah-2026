package com.telecrazy.hackyeah2026backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * System clock as a bean, so time-dependent logic (e.g. QR token expiry) can use a fixed clock in tests.
 */
@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
