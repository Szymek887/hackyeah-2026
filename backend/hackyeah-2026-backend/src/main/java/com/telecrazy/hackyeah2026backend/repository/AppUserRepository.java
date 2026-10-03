package com.telecrazy.hackyeah2026backend.repository;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
}
