package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.auth.CurrentUser;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Comparator<AppUser> DEMO_ORDER = Comparator
            .comparing(AppUser::getRole)
            .thenComparing(AppUser::getId);

    private final AppUserRepository userRepository;
    private final Clock clock;

    public UserController(AppUserRepository userRepository, Clock clock) {
        this.userRepository = userRepository;
        this.clock = clock;
    }

    /**
     * Public list of accounts for the mock login screen: requesters, then volunteers, then city admins.
     * Ids depend on the database, so the client must not hard-code them.
     */
    @GetMapping("/demo")
    public List<UserProfileResponse> demo() {
        return userRepository.findAll().stream()
                .sorted(DEMO_ORDER)
                .map(UserProfileResponse::from)
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
     * Grants or withdraws the consent to store the caller's special needs and share them with the accepted
     * volunteer. Withdrawing deletes the consent record and the special-needs information; granting creates
     * the record and stores the special needs again. Takes effect immediately, also on accepted requests.
     */
    @PutMapping("/me/special-needs-consent")
    public UserProfileResponse updateSpecialNeedsConsent(
            @CurrentUser AppUser user,
            @Valid @RequestBody UpdateSpecialNeedsConsentRequest request
    ) {
        if (user.getRole() != UserRole.REQUESTER) {
            throw new ForbiddenException("Only requesters can manage special-needs consent");
        }
        if (request.consent()) {
            user.grantSpecialNeedsConsent(clock.instant());
        } else {
            user.withdrawSpecialNeedsConsent();
        }
        return UserProfileResponse.from(userRepository.save(user));
    }
}
