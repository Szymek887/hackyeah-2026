package com.telecrazy.hackyeah2026backend.domain;

import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.service.SpecialNeedsService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs against the development PostGIS database (docker compose); every test rolls back.
 * Changes go through {@link SpecialNeedsService} like in production, and the actual rows are checked,
 * because withdrawing the consent must delete the consent record and the disabilities.
 */
@SpringBootTest
@Transactional
class SpecialNeedsConsentPersistenceTest {

    private static final Instant GRANTED_AT = Instant.parse("2026-10-04T09:00:00Z");

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private SpecialNeedsService specialNeedsService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long userId;
    private long consentId;

    @BeforeEach
    void requesterWithConsentAndDisabilities() {
        AppUser user = new AppUser("Consent Test", UserRole.REQUESTER, true, 50);
        user.grantSpecialNeedsConsent(GRANTED_AT);
        user.replaceDisabilities(List.of(DisabilityType.VISION, DisabilityType.MOBILITY));
        user.replaceSpecialNeedNotes(List.of("Nie słyszę pukania", "3. piętro bez windy"));
        userId = userRepository.saveAndFlush(user).getId();
        consentId = user.getSpecialNeedsConsent().getId();
        assertThat(consentRows(consentId)).isEqualTo(1);
        assertThat(disabilityRows()).isEqualTo(2);
        assertThat(specialNeedsColumn()).isTrue();
    }

    @Test
    void withdrawingConsentDeletesConsentRowSpecialNeedsAndDisabilities() {
        specialNeedsService.updateConsent(userId, false);
        entityManager.flush();

        assertThat(consentRows(consentId)).isZero();
        assertThat(disabilityRows()).isZero();
        assertThat(notes()).isEmpty();
        assertThat(specialNeedsColumn()).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT special_needs_consent_id FROM app_users WHERE id = ?", Long.class, userId)).isNull();
    }

    @Test
    void disabilitiesAreReplacedAndCanBeCleared() {
        specialNeedsService.updateDisabilities(userId, List.of(DisabilityType.HEARING));
        entityManager.flush();
        assertThat(disabilities()).containsExactly("HEARING");

        specialNeedsService.updateDisabilities(userId, List.of());
        entityManager.flush();
        assertThat(disabilityRows()).isZero();
        // No disabilities → not marked as disabled, but the consent stays.
        assertThat(specialNeedsColumn()).isFalse();
        assertThat(consentRows(consentId)).isEqualTo(1);
    }

    @Test
    void specialNeedNotesAreStoredInOrderAndReplaced() {
        assertThat(notes()).containsExactly("Nie słyszę pukania", "3. piętro bez windy");

        specialNeedsService.updateSpecialNeedNotes(userId, List.of("Proszę dzwonić na telefon"));
        entityManager.flush();
        assertThat(notes()).containsExactly("Proszę dzwonić na telefon");
    }

    @Test
    void grantingAgainCreatesANewConsentRowWithoutMarkingUserAsDisabled() {
        specialNeedsService.updateConsent(userId, false);
        entityManager.flush();

        specialNeedsService.updateConsent(userId, true);
        entityManager.flush();
        entityManager.clear();

        AppUser reloaded = userRepository.findById(userId).orElseThrow();
        assertThat(reloaded.isSpecialNeeds()).isFalse();
        assertThat(reloaded.getSpecialNeedsConsent().getId()).isNotEqualTo(consentId);
        assertThat(reloaded.getDisabilities()).isEmpty();
        assertThat(consentRows(consentId)).isZero();
    }

    private List<String> disabilities() {
        return jdbcTemplate.queryForList(
                "SELECT disability FROM app_user_disabilities WHERE user_id = ?", String.class, userId);
    }

    private List<String> notes() {
        return jdbcTemplate.queryForList(
                "SELECT note FROM app_user_special_need_notes WHERE user_id = ? ORDER BY position", String.class, userId);
    }

    private int disabilityRows() {
        return disabilities().size();
    }

    private Boolean specialNeedsColumn() {
        return jdbcTemplate.queryForObject("SELECT special_needs FROM app_users WHERE id = ?", Boolean.class, userId);
    }

    private int consentRows(long id) {
        return jdbcTemplate.queryForObject(
                "SELECT count(*) FROM special_needs_consents WHERE id = ?", Integer.class, id);
    }
}
