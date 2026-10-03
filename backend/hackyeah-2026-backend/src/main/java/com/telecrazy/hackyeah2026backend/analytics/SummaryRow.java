package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

record SummaryRow(HelpCategory category, HelpRequestStatus status, int priority, long count) {
}
