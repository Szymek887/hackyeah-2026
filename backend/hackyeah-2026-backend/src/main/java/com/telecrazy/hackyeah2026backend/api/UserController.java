package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.auth.CurrentUser;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.springframework.web.bind.annotation.GetMapping;
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

    public UserController(AppUserRepository userRepository) {
        this.userRepository = userRepository;
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
}
