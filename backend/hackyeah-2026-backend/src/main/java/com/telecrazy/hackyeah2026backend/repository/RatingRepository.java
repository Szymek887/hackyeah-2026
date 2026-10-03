package com.telecrazy.hackyeah2026backend.repository;

import com.telecrazy.hackyeah2026backend.domain.Rating;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RatingRepository extends JpaRepository<Rating, Long> {
}
