package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.auth.CurrentUser;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.service.SpecialNeedsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Comparator<AppUser> DEMO_ORDER = Comparator
            .comparing(AppUser::getRole)
            .thenComparing(AppUser::getId);

    private final AppUserRepository userRepository;
    private final SpecialNeedsService specialNeedsService;

    public UserController(AppUserRepository userRepository, SpecialNeedsService specialNeedsService) {
        this.userRepository = userRepository;
        this.specialNeedsService = specialNeedsService;
    }

    /**
     * Public list of accounts for the mock login screen: requesters, then volunteers, then city admins.
     * Ids depend on the database, so the client must not hard-code them.
     */
    @GetMapping("/demo")
    public List<UserProfileResponse> demo() {
        return userRepository.findAll().stream()
                .sorted(DEMO_ORDER)
                .map(UserProfileResponse::forDemoList)
                .toList();
    }

    @GetMapping("/me")
    public UserProfileResponse me(@CurrentUser AppUser user) {
        return UserProfileResponse.from(user);
    }

    /** Replaces the languages the caller speaks. */
    @PutMapping("/me/languages")
    public UserProfileResponse updateLanguages(
            @CurrentUser AppUser user,
            @Valid @RequestBody UpdateLanguagesRequest request
    ) {
        user.replaceLanguages(request.languages());
        return UserProfileResponse.from(userRepository.save(user));
    }

    /**
     * Grants or withdraws the consent to store the caller's disabilities and share them with the accepted
     * volunteer. Granting only creates the consent record – the caller is marked as disabled once they declare
     * disabilities. Withdrawing deletes the record, the disabilities, the special-need notes and the marking.
     * Takes effect immediately.
     */
    @PutMapping("/me/special-needs-consent")
    public UserProfileResponse updateSpecialNeedsConsent(
            @CurrentUser AppUser user,
            @Valid @RequestBody UpdateSpecialNeedsConsentRequest request
    ) {
        return specialNeedsService.updateConsent(user.getId(), request.consent());
    }

    /**
     * Replaces the kinds of disability the caller declares. Requesters only, and only while the special-needs
     * consent exists – without it no disability information may be stored. A non-empty list marks the caller as
     * disabled, an empty one removes the marking.
     */
    @PutMapping("/me/disabilities")
    public UserProfileResponse updateDisabilities(
            @CurrentUser AppUser user,
            @Valid @RequestBody UpdateDisabilitiesRequest request
    ) {
        return specialNeedsService.updateDisabilities(user.getId(), request.disabilities());
    }

    /**
     * Replaces the special needs the caller describes in their own words, extending the disabilities (e.g.
     * "Nie słyszę pukania"). Same rules as disabilities: requesters only, only while the consent exists. They
     * do not mark the caller as disabled.
     */
    @PutMapping("/me/special-need-notes")
    public UserProfileResponse updateSpecialNeedNotes(
            @CurrentUser AppUser user,
            @Valid @RequestBody UpdateSpecialNeedNotesRequest request
    ) {
        return specialNeedsService.updateSpecialNeedNotes(user.getId(), request.notes());
    }
}
