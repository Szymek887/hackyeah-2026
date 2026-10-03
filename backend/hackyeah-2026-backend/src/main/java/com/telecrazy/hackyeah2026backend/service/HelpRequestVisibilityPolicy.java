package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.HelpRequestView.ViewerRole;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/**
 * Decides how much of a help request a user may see.
 * <ul>
 *     <li>the requester always sees everything,</li>
 *     <li>the assigned volunteer sees everything once the requester accepted the offer,</li>
 *     <li>everyone else sees the public (masked) view,</li>
 *     <li>requests under review are visible only to the requester.</li>
 * </ul>
 */
public final class HelpRequestVisibilityPolicy {

    private static final Set<HelpRequestStatus> VOLUNTEER_FULL_ACCESS_STATUSES = EnumSet.of(
            HelpRequestStatus.ACCEPTED,
            HelpRequestStatus.COMPLETED,
            HelpRequestStatus.RATED
    );

    private HelpRequestVisibilityPolicy() {
    }

    public static boolean canSee(HelpRequest request, AppUser user) {
        return !request.getStatus().isHiddenFromPublic() || isRequester(request, user);
    }

    public static boolean canSeeFullDetails(HelpRequest request, AppUser user) {
        return isRequester(request, user) || isAssignedVolunteerAfterAcceptance(request, user);
    }

    public static ViewerRole viewerRole(HelpRequest request, AppUser user) {
        if (isRequester(request, user)) {
            return ViewerRole.REQUESTER;
        }
        return isVolunteer(request, user) ? ViewerRole.VOLUNTEER : ViewerRole.NONE;
    }

    public static boolean isRequester(HelpRequest request, AppUser user) {
        return Objects.equals(request.getRequester().getId(), user.getId());
    }

    /** The volunteer who offered help or was accepted, regardless of the status. */
    public static boolean isVolunteer(HelpRequest request, AppUser user) {
        AppUser volunteer = request.getVolunteer();
        return volunteer != null && Objects.equals(volunteer.getId(), user.getId());
    }

    private static boolean isAssignedVolunteerAfterAcceptance(HelpRequest request, AppUser user) {
        return isVolunteer(request, user) && VOLUNTEER_FULL_ACCESS_STATUSES.contains(request.getStatus());
    }
}
