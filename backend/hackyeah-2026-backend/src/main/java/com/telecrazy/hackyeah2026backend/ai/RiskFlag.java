package com.telecrazy.hackyeah2026backend.ai;

public enum RiskFlag {
    /** Looks like fraud, e.g. asks for money transfers, BLIK codes or card details. */
    SCAM_SUSPECTED,
    /** Life-threatening situation that needs emergency services (112), not a volunteer. */
    MEDICAL_EMERGENCY,
    /** Description contains sensitive personal data that should not be published. */
    PERSONAL_DATA,
    /** Offensive, illegal or otherwise inappropriate content. */
    INAPPROPRIATE_CONTENT
}
