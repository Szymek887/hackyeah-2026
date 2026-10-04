import type { Category, Priority, RequestStatus, RiskFlag, UserRole } from '@/api/types';

export const CategoryLabels: Record<Category, string> = {
  MEDICINE: 'Leki',
  GROCERIES: 'Zakupy',
  EQUIPMENT_LOAN: 'Pożyczenie sprzętu',
  HOME_SUPPORT: 'Pomoc w domu',
  SOCIAL: 'Towarzystwo',
};

export const PriorityLabels: Record<Priority, string> = {
  0: 'Specjalne',
  1: 'Pilne',
  2: 'Ważne',
  3: 'Zwykłe',
};

export const StatusLabels: Record<RequestStatus, string> = {
  OPEN: 'Otwarte',
  OFFERED: 'Ktoś chce pomóc',
  ACCEPTED: 'Zaakceptowane',
  COMPLETED: 'Zrealizowane',
  RATED: 'Ocenione',
  CANCELLED: 'Anulowane',
  UNDER_REVIEW: 'W weryfikacji',
};

export const RiskFlagLabels: Record<RiskFlag, string> = {
  SCAM_SUSPECTED: 'Podejrzenie oszustwa',
  MEDICAL_EMERGENCY: 'Nagły przypadek medyczny',
  PERSONAL_DATA: 'Dane osobowe w treści',
  INAPPROPRIATE_CONTENT: 'Niestosowna treść',
};

/** "5 min temu", "2 godz. temu", "3 dni temu". */
export function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  return `${Math.round(hours / 24)} dni temu`;
}

export const RoleLabels: Record<UserRole, string> = {
  REQUESTER: 'Potrzebuję pomocy',
  VOLUNTEER: 'Potrzebuję i pomagam',
  CITY_ADMIN: 'Urząd miasta',
};
