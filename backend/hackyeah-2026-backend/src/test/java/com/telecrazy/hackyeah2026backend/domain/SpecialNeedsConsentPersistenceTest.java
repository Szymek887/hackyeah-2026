package com.telecrazy.hackyeah2026backend.domain;

import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs against the development PostGIS database (docker compose); every test rolls back.
 * Checks the actual rows, because withdrawing consent must delete the consent record.
 */
@SpringBootTest
@Transactional
class SpecialNeedsConsentPersistenceTest {

    private static final Instant GRANTED_AT = Instant.parse("2026-10-04T09:00:00Z");

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void withdrawingConsentDeletesTheConsentRowAndSpecialNeeds() {
        AppUser user = new AppUser("Consent Test", UserRole.REQUESTER, true, false, 50);
        user.grantSpecialNeedsConsent(GRANTED_AT);
        long userId = userRepository.saveAndFlush(user).getId();
        long consentId = user.getSpecialNeedsConsent().getId();
        assertThat(consentRows(consentId)).isEqualTo(1);

        user.withdrawSpecialNeedsConsent();
        userRepository.saveAndFlush(user);

        assertThat(consentRows(consentId)).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT special_needs FROM app_users WHERE id = ?", Boolean.class, userId)).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT special_needs_consent_id FROM app_users WHERE id = ?", Long.class, userId)).isNull();
    }

    @Test
    void grantingAgainCreatesANewConsentRow() {
        AppUser user = new AppUser("Consent Test", UserRole.REQUESTER, true, false, 50);
        user.grantSpecialNeedsConsent(GRANTED_AT);
        userRepository.saveAndFlush(user);
        long firstConsentId = user.getSpecialNeedsConsent().getId();
        user.withdrawSpecialNeedsConsent();
        userRepository.saveAndFlush(user);

        user.grantSpecialNeedsConsent(GRANTED_AT.plusSeconds(3600));
        userRepository.saveAndFlush(user);
        entityManager.clear();

        AppUser reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.isSpecialNeeds()).isTrue();
        assertThat(reloaded.getSpecialNeedsConsent().getId()).isNotEqualTo(firstConsentId);
        assertThat(reloaded.getSpecialNeedsConsent().getGrantedAt()).isEqualTo(GRANTED_AT.plusSeconds(3600));
        assertThat(consentRows(firstConsentId)).isZero();
    }

    private int consentRows(long consentId) {
        return jdbcTemplate.queryForObject(
                "SELECT count(*) FROM special_needs_consents WHERE id = ?", Integer.class, consentId);
    }
}
