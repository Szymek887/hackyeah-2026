package com.telecrazy.hackyeah2026backend.repository;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface HelpRequestRepository extends JpaRepository<HelpRequest, Long> {

    /** Row lock for state transitions, so concurrent actions on one request run one after another. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM HelpRequest r WHERE r.id = :id")
    Optional<HelpRequest> findByIdForUpdate(@Param("id") long id);

    /** Moderation queue: requests in one status, oldest first, with their requester. */
    @EntityGraph(attributePaths = "requester")
    List<HelpRequest> findByStatusOrderByCreatedAtAsc(HelpRequestStatus status);

    /** Whether the volunteer already takes part in a request in one of these statuses. */
    boolean existsByVolunteerAndStatusIn(AppUser volunteer, Collection<HelpRequestStatus> statuses);

    /** Requests the user created or volunteers on, newest first. */
    @EntityGraph(attributePaths = {"requester", "volunteer"})
    @Query("SELECT r FROM HelpRequest r WHERE r.requester = :user OR r.volunteer = :user ORDER BY r.createdAt DESC")
    List<HelpRequest> findInvolving(@Param("user") AppUser user);

    @Query(value = """
            SELECT *
            FROM help_requests
            WHERE status = 'OPEN'
              AND ST_DWithin(
                    location::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radiusMeters
                  )
            ORDER BY priority ASC, created_at DESC
            """, nativeQuery = true)
    List<HelpRequest> findOpenWithinRadius(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radiusMeters") double radiusMeters
    );

    @Query(value = """
            SELECT *
            FROM help_requests
            WHERE status = 'OPEN'
              AND ST_DWithin(
                    location::geography,
                    ST_SetSRID(ST_GeomFromText(:lineStringWkt), 4326)::geography,
                    :bufferMeters
                  )
            ORDER BY priority ASC, created_at DESC
            """, nativeQuery = true)
    List<HelpRequest> findOpenAlongRoute(
            @Param("lineStringWkt") String lineStringWkt,
            @Param("bufferMeters") double bufferMeters
    );
}
