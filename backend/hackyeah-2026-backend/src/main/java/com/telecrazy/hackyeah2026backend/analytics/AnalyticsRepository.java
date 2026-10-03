package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

/**
 * Aggregating queries for the city dashboard. Returns counts only, never individual requests.
 */
@Repository
public class AnalyticsRepository {

    /**
     * Each request is assigned to the single hexagon of a global grid that contains it
     * ({@code ST_HexagonGrid} evaluated per point, so cost grows with the number of requests,
     * not with the covered area). The grid is built in Web Mercator (EPSG:3857); its units are
     * scaled by the average latitude of all requests so that hexagons are close to the requested
     * size in real metres and stay in the same place regardless of filters.
     */
    private static final String HEATMAP_SQL = """
            WITH scale AS (
                SELECT :hexSizeMeters / cos(radians(coalesce(avg(ST_Y(location)), 0))) AS hex_size
                FROM help_requests
            )
            SELECT h.i,
                   h.j,
                   ST_X(ST_Transform(ST_Centroid(h.geom), 4326)) AS center_lng,
                   ST_Y(ST_Transform(ST_Centroid(h.geom), 4326)) AS center_lat,
                   ST_AsGeoJSON(ST_Transform(h.geom, 4326), 6)   AS area,
                   r.category,
                   count(*)                                      AS cnt,
                   sum(4 - r.priority)                           AS weight
            FROM help_requests r
            CROSS JOIN scale s
            CROSS JOIN LATERAL (
                SELECT g.i, g.j, g.geom
                FROM ST_HexagonGrid(s.hex_size, ST_Transform(r.location, 3857)) g
                LIMIT 1
            ) h
            %s
            GROUP BY h.i, h.j, h.geom, r.category
            ORDER BY h.i, h.j, r.category
            """;

    private static final String SUMMARY_SQL = """
            SELECT r.category, r.status, r.priority, count(*) AS cnt
            FROM help_requests r
            %s
            GROUP BY r.category, r.status, r.priority
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public AnalyticsRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<HeatmapRow> heatmap(AnalyticsFilter filter, double hexSizeMeters) {
        MapSqlParameterSource params = new MapSqlParameterSource("hexSizeMeters", hexSizeMeters);
        String sql = HEATMAP_SQL.formatted(where(filter, params));

        return jdbc.query(sql, params, (rs, rowNum) -> new HeatmapRow(
                rs.getLong("i"),
                rs.getLong("j"),
                rs.getDouble("center_lng"),
                rs.getDouble("center_lat"),
                rs.getString("area"),
                HelpCategory.valueOf(rs.getString("category")),
                rs.getLong("cnt"),
                rs.getLong("weight")
        ));
    }

    public List<SummaryRow> summary(AnalyticsFilter filter) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        String sql = SUMMARY_SQL.formatted(where(filter, params));

        return jdbc.query(sql, params, (rs, rowNum) -> new SummaryRow(
                HelpCategory.valueOf(rs.getString("category")),
                HelpRequestStatus.valueOf(rs.getString("status")),
                rs.getInt("priority"),
                rs.getLong("cnt")
        ));
    }

    private static String where(AnalyticsFilter filter, MapSqlParameterSource params) {
        List<String> conditions = new ArrayList<>();
        if (filter.category() != null) {
            conditions.add("r.category = :category");
            params.addValue("category", filter.category().name());
        }
        if (!filter.statuses().isEmpty()) {
            conditions.add("r.status IN (:statuses)");
            params.addValue("statuses", filter.statuses().stream().map(Enum::name).toList());
        }
        if (filter.from() != null) {
            conditions.add("r.created_at >= :from");
            params.addValue("from", Timestamp.from(filter.from()));
        }
        if (filter.to() != null) {
            conditions.add("r.created_at < :to");
            params.addValue("to", Timestamp.from(filter.to()));
        }
        return conditions.isEmpty() ? "" : "WHERE " + String.join(" AND ", conditions);
    }
}
