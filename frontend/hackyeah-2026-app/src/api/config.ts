/** Configured via .env.local (see .env.example). Mocks are on unless explicitly disabled. */
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS !== 'false';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
