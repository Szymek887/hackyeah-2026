package com.telecrazy.hackyeah2026backend.repository;

import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface HelpRequestRepository extends JpaRepository<HelpRequest, Long> {

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
