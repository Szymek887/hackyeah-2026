package com.telecrazy.hackyeah2026backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Brings existing databases in line with the rule from {@code AppUser}: a user is marked as having special
 * needs only with a consent record <em>and</em> at least one declared disability. Older versions set the flag
 * together with the consent, so rows with a consent but no disabilities would otherwise keep the priority bump.
 */
@Configuration
public class SpecialNeedsDataInitializer {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    ApplicationRunner clearSpecialNeedsWithoutDisabilities(JdbcTemplate jdbcTemplate) {
        return args -> {
            // Disabilities and special-need notes are health data and must not outlive the consent.
            for (String table : new String[]{"app_user_disabilities", "app_user_special_need_notes"}) {
                jdbcTemplate.update("DELETE FROM " + table + " t USING app_users u "
                        + "WHERE t.user_id = u.id AND u.special_needs_consent_id IS NULL");
            }
            jdbcTemplate.update("""
                    UPDATE app_users u SET special_needs = false
                    WHERE u.special_needs
                      AND (u.special_needs_consent_id IS NULL
                           OR NOT EXISTS (SELECT 1 FROM app_user_disabilities d WHERE d.user_id = u.id))
                    """);
        };
    }
}
