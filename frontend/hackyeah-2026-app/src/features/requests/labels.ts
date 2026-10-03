import type { Category, Priority, RequestStatus, UserRole } from '@/api/types';

export const CategoryLabels: Record<Category, string> = {
  BASIC_NEEDS: 'Leki i zakupy',
  EQUIPMENT_LOAN: 'Pożyczenie sprzętu',
  HOME_SUPPORT: 'Pomoc domowa',
  SOCIAL: 'Towarzystwo',
};

export const PriorityLabels: Record<Priority, string> = {
  1: 'Pilne',
  2: 'Średni priorytet',
  3: 'Niski priorytet',
};

export const StatusLabels: Record<RequestStatus, string> = {
  OPEN: 'Otwarte',
  OFFERED: 'Ktoś chce pomóc',
  ACCEPTED: 'Zaakceptowane',
  COMPLETED: 'Zrealizowane',
  RATED: 'Ocenione',
  CANCELLED: 'Anulowane',
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
  VOLUNTEER: 'Wolontariusz',
  CITY_ADMIN: 'Urząd miasta',
};
