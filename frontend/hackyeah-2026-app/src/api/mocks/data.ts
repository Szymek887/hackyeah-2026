import type { HelpRequestDetails, User } from '@/api/types';
import { point } from '@/lib/geo';

export const mockRequester: User = {
  id: 'u-requester',
  displayName: 'Pani Halina',
  role: 'REQUESTER',
  verified: true,
  trustScore: 82,
  ratingAverage: 4.8,
  ratingCount: 12,
  hasSpecialNeeds: true,
  cityPoints: 40,
};

export const mockVolunteer: User = {
  id: 'u-volunteer',
  displayName: 'Kuba',
  role: 'VOLUNTEER',
  verified: true,
  trustScore: 91,
  ratingAverage: 4.9,
  ratingCount: 27,
  hasSpecialNeeds: false,
  cityPoints: 310,
};

const otherRequester = {
  id: 'u-2',
  displayName: 'Pan Zbigniew',
  verified: false,
  trustScore: 55,
  ratingAverage: 4.2,
  ratingCount: 3,
};

const toPublic = (user: User) => ({
  id: user.id,
  displayName: user.displayName,
  verified: user.verified,
  trustScore: user.trustScore,
  ratingAverage: user.ratingAverage,
  ratingCount: user.ratingCount,
});

/** Full records. The API layer strips exact location / address before returning list items. */
export const mockRequests: HelpRequestDetails[] = [
  {
    id: 'r-1',
    title: 'Skończyły mi się leki na serce',
    description: 'Skończyły mi się leki na serce, nie mam jak wyjść. Recepta jest w aplikacji.',
    category: 'BASIC_NEEDS',
    priority: 1,
    status: 'OPEN',
    tags: ['leki', 'apteka', 'senior'],
    accessibilitySupport: true,
    area: { center: point(50.0647, 19.945), radiusMeters: 300 },
    requester: toPublic(mockRequester),
    createdAt: '2026-10-03T09:15:00Z',
    exactLocation: point(50.0652, 19.9441),
    address: { street: 'ul. Długa', building: '12', apartment: '4', city: 'Kraków' },
  },
  {
    id: 'r-2',
    title: 'Pożyczę drabinę na godzinę',
    description: 'Muszę wymienić żarówkę w przedpokoju, potrzebna drabina ok. 2 m.',
    category: 'EQUIPMENT_LOAN',
    priority: 3,
    status: 'OPEN',
    tags: ['drabina', 'narzędzia'],
    accessibilitySupport: false,
    area: { center: point(50.0545, 19.9265), radiusMeters: 300 },
    requester: otherRequester,
    createdAt: '2026-10-03T08:40:00Z',
    exactLocation: point(50.0541, 19.9272),
    address: { street: 'ul. Kalwaryjska', building: '30', city: 'Kraków' },
  },
  {
    id: 'r-3',
    title: 'Cieknie kran w kuchni',
    description: 'Kran cieknie od rana, nie wiem jak zakręcić zawór.',
    category: 'HOME_SUPPORT',
    priority: 2,
    status: 'OPEN',
    tags: ['hydraulika', 'awaria'],
    accessibilitySupport: false,
    area: { center: point(50.0705, 19.9555), radiusMeters: 300 },
    requester: otherRequester,
    createdAt: '2026-10-03T07:05:00Z',
    exactLocation: point(50.0709, 19.9561),
    address: { street: 'ul. Lubomirskiego', building: '5', apartment: '11', city: 'Kraków' },
  },
  {
    id: 'r-4',
    title: 'Szukam towarzystwa na spacer',
    description: 'Chętnie wyjdę na spacer po Plantach, ale sama boję się chodzić.',
    category: 'SOCIAL',
    priority: 3,
    status: 'OPEN',
    tags: ['spacer', 'towarzystwo'],
    accessibilitySupport: true,
    area: { center: point(50.0585, 19.9385), radiusMeters: 300 },
    requester: toPublic(mockRequester),
    createdAt: '2026-10-02T16:20:00Z',
    exactLocation: point(50.0589, 19.9379),
    address: { street: 'ul. Grodzka', building: '40', city: 'Kraków' },
  },
];
