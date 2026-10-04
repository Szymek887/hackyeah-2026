package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class HelpRequestVisibilityPolicyTest {

    private final AppUser requester = user(1L, UserRole.REQUESTER);
    private final AppUser volunteer = user(2L, UserRole.VOLUNTEER);
    private final AppUser stranger = user(3L, UserRole.VOLUNTEER);

    @ParameterizedTest
    @EnumSource(HelpRequestStatus.class)
    void requesterAlwaysSeesFullDetails(HelpRequestStatus status) {
        HelpRequest request = request(status, volunteer);

        assertThat(HelpRequestVisibilityPolicy.canSee(request, requester)).isTrue();
        assertThat(HelpRequestVisibilityPolicy.canSeeFullDetails(request, requester)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = HelpRequestStatus.class, names = {"ACCEPTED", "COMPLETED", "RATED"})
    void assignedVolunteerSeesFullDetailsAfterAcceptance(HelpRequestStatus status) {
        assertThat(HelpRequestVisibilityPolicy.canSeeFullDetails(request(status, volunteer), volunteer)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = HelpRequestStatus.class, names = {"OPEN", "OFFERED", "CANCELLED"})
    void assignedVolunteerSeesOnlyPublicDetailsBeforeAcceptance(HelpRequestStatus status) {
        assertThat(HelpRequestVisibilityPolicy.canSeeFullDetails(request(status, volunteer), volunteer)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(HelpRequestStatus.class)
    void strangerNeverSeesFullDetails(HelpRequestStatus status) {
        assertThat(HelpRequestVisibilityPolicy.canSeeFullDetails(request(status, volunteer), stranger)).isFalse();
    }

    @Test
    void requestUnderReviewIsHiddenFromEveryoneButRequester() {
        HelpRequest request = request(HelpRequestStatus.UNDER_REVIEW, null);

        assertThat(HelpRequestVisibilityPolicy.canSee(request, requester)).isTrue();
        assertThat(HelpRequestVisibilityPolicy.canSee(request, stranger)).isFalse();
        assertThat(HelpRequestVisibilityPolicy.canSee(request, user(9L, UserRole.CITY_ADMIN))).isFalse();
    }

    private HelpRequest request(HelpRequestStatus status, AppUser assignedVolunteer) {
        HelpRequest request = new HelpRequest();
        request.setRequester(requester);
        request.setVolunteer(assignedVolunteer);
        request.setStatus(status);
        return request;
    }

    private static AppUser user(long id, UserRole role) {
        AppUser user = new AppUser("User " + id, role, true, 50);
        user.setId(id);
        return user;
    }
}
