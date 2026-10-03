package com.telecrazy.hackyeah2026backend.config;

import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Hibernate creates a CHECK constraint listing enum values only when the table is created;
 * {@code ddl-auto=update} never refreshes it. Rebuilding it from {@link HelpRequestStatus} on startup
 * lets new statuses (e.g. {@code UNDER_REVIEW}) work on databases created before they existed.
 */
@Configuration
public class StatusConstraintInitializer {

    @Bean
    ApplicationRunner refreshHelpRequestStatusConstraint(JdbcTemplate jdbcTemplate) {
        return args -> {
            String allowedStatuses = Arrays.stream(HelpRequestStatus.values())
                    .map(status -> "'" + status.name() + "'")
                    .collect(Collectors.joining(", "));

            jdbcTemplate.execute("ALTER TABLE help_requests DROP CONSTRAINT IF EXISTS help_requests_status_check");
            jdbcTemplate.execute("ALTER TABLE help_requests ADD CONSTRAINT help_requests_status_check "
                    + "CHECK (status IN (" + allowedStatuses + "))");
        };
    }
}
