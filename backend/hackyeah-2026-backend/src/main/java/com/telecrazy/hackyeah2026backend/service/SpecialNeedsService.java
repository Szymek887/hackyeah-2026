package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.UserProfileResponse;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.DisabilityType;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.exception.ConflictException;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.exception.NotFoundException;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Collection;

/**
 * Special-needs consent and declared disabilities (health data, contract §3.6).
 * <p>
 * Changes are made on the managed entity and written by dirty checking at commit – deliberately no
 * {@code repository.save()}: {@code save} merges an already managed entity, and Hibernate's merge
 * replaces its collections, which loses the deletion of an emptied collection (the disability rows
 * would stay in the database after withdrawing the consent).
 */
@Service
public class SpecialNeedsService {

    private final AppUserRepository userRepository;
    private final Clock clock;

    public SpecialNeedsService(AppUserRepository userRepository, Clock clock) {
        this.userRepository = userRepository;
        this.clock = clock;
    }

    /**
     * {@code true} creates the consent record (the user is marked as disabled only after declaring
     * disabilities); {@code false} deletes the record, the disabilities, the special-need notes and the marking.
     */
    @Transactional
    public UserProfileResponse updateConsent(long userId, boolean consent) {
        AppUser user = requester(userId, "Only requesters can manage special-needs consent");
        if (consent) {
            user.grantSpecialNeedsConsent(clock.instant());
        } else {
            user.withdrawSpecialNeedsConsent();
        }
        return UserProfileResponse.from(user);
    }

    /** Replaces the declared disabilities (an empty list removes the marking); requires the consent. */
    @Transactional
    public UserProfileResponse updateDisabilities(long userId, Collection<DisabilityType> disabilities) {
        AppUser user = requester(userId, "Only requesters can store disabilities");
        if (!user.hasSpecialNeedsConsent()) {
            throw new ConflictException("Give the special-needs consent before storing disabilities");
        }
        user.replaceDisabilities(disabilities);
        return UserProfileResponse.from(user);
    }

    /** Replaces the special needs described in the user's own words; requires the consent. */
    @Transactional
    public UserProfileResponse updateSpecialNeedNotes(long userId, Collection<String> notes) {
        AppUser user = requester(userId, "Only requesters can store special needs");
        if (!user.hasSpecialNeedsConsent()) {
            throw new ConflictException("Give the special-needs consent before storing special needs");
        }
        user.replaceSpecialNeedNotes(notes);
        return UserProfileResponse.from(user);
    }

    private AppUser requester(long userId, String forbiddenMessage) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User " + userId + " not found"));
        if (user.getRole() != UserRole.REQUESTER) {
            throw new ForbiddenException(forbiddenMessage);
        }
        return user;
    }
}
