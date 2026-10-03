package com.telecrazy.hackyeah2026backend.api;

import java.util.List;

public record RouteSearchRequest(List<RoutePoint> points, double bufferMeters) {
}
