/**
 * In-memory copy of the backend database, seeded exactly like `config/DatabaseSeeder.java`
 * (same users and ids, same Kraków clusters), so the demo looks the same with and without the backend.
 * Only src/api/mocks/server.ts may read or change it.
 */
import type {
  Category,
  ClassificationSource,
  Priority,
  RequestStatus,
  RiskFlag,
  UserProfile,
} from '@/api/types';

/** Entity `HelpRequest` (not a DTO – the server turns it into views). */
export type MockHelpRequest = {
  id: number;
  requesterId: number;
  volunteerId: number | null;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  aiPriority: number | null;
  status: RequestStatus;
  tags: string[];
  riskFlags: RiskFlag[];
  classificationSource: ClassificationSource | null;
  lat: number;
  lng: number;
  street: string;
  buildingNumber: string;
  apartmentNumber: string | null;
  createdAt: string;
  updatedAt: string;
  handoffToken: string | null;
  handoffTokenExpiresAt: string | null;
  handoffTokenUsedAt: string | null;
};

/** Entity `Rating`. */
export type MockRating = {
  requestId: number;
  fromUserId: number;
  toUserId: number;
  stars: number;
  comment: string | null;
};

type SeedUser = [
  displayName: string,
  role: UserProfile['role'],
  verified: boolean,
  specialNeeds: boolean,
  trust: number,
];

// Same order as the seeder, so ids match the real database (1 = Anna K. … 13 = Miasto Kraków).
const SEED_USERS: SeedUser[] = [
  ['Anna K.', 'REQUESTER', true, true, 72],
  ['Marek S.', 'REQUESTER', true, false, 66],
  ['Ewa P.', 'REQUESTER', false, false, 45],
  ['Zofia M.', 'REQUESTER', true, true, 81],
  ['Jan B.', 'REQUESTER', true, false, 58],
  ['Halina R.', 'REQUESTER', true, true, 77],
  ['Piotr N.', 'REQUESTER', false, false, 40],
  ['Maria T.', 'REQUESTER', true, false, 69],
  ['Kuba W.', 'VOLUNTEER', true, false, 91],
  ['Ola D.', 'VOLUNTEER', true, false, 88],
  ['Bartek L.', 'VOLUNTEER', true, false, 84],
  ['Nadia P.', 'VOLUNTEER', false, false, 63],
  ['Miasto Kraków', 'CITY_ADMIN', true, false, 100],
];

export const users: UserProfile[] = SEED_USERS.map(
  ([displayName, role, identityVerified, specialNeeds, trustScore], index) => ({
    id: index + 1,
    displayName,
    role,
    identityVerified,
    specialNeeds,
    trustScore,
    ratingCount: 0,
    ratingAverage: null,
    cityPoints: 0,
  }),
);

export const requests: MockHelpRequest[] = [];
export const ratings: MockRating[] = [];

let nextRequestId = 1;
export const newRequestId = () => nextRequestId++;

const ANNA = 1;
const MAREK = 2;
const ZOFIA = 4;
const KUBA = 9;
const REQUESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const VOLUNTEERS = [9, 10, 11];

const now = Date.now();
let minutesAgo = 0;

function addRequest(
  requesterId: number,
  title: string,
  description: string,
  category: Category,
  priority: Priority,
  lng: number,
  lat: number,
  street: string,
  buildingNumber: string,
  apartmentNumber: string | null,
): MockHelpRequest {
  minutesAgo += 17;
  const createdAt = new Date(now - minutesAgo * 60_000).toISOString();
  const request: MockHelpRequest = {
    id: newRequestId(),
    requesterId,
    volunteerId: null,
    title,
    description,
    category,
    priority,
    aiPriority: null,
    status: 'OPEN',
    tags: [],
    riskFlags: [],
    classificationSource: null,
    lat,
    lng,
    street,
    buildingNumber,
    apartmentNumber,
    createdAt,
    updatedAt: createdAt,
    handoffToken: null,
    handoffTokenExpiresAt: null,
    handoffTokenUsedAt: null,
  };
  requests.push(request);
  return request;
}

// --- seedRouteDemoRequests ---
addRequest(
  ANNA,
  'Pilny odbior lekow na serce',
  'Skonczyly mi sie leki na serce, nie mam jak wyjsc z domu.',
  'MEDICINE',
  1,
  19.9389,
  50.0587,
  'Zwierzyniecka',
  '24',
  '8',
);
addRequest(
  MAREK,
  'Zakupy po drodze z pracy',
  'Potrzebuje kilku podstawowych produktow: chleb, mleko, jajka i warzywa.',
  'GROCERIES',
  2,
  19.9451,
  50.0643,
  'Basztowa',
  '10',
  '3',
);
Object.assign(
  addRequest(
    ZOFIA,
    'Pomoc z torba po rehabilitacji',
    'Wracam z rehabilitacji i potrzebuje pomocy z lekka torba do mieszkania.',
    'HOME_SUPPORT',
    2,
    19.9556,
    50.0703,
    'Rakowicka',
    '20',
    '15',
  ),
  { status: 'OFFERED', volunteerId: KUBA },
);

// --- seedCluster ---
type Template = [
  title: string,
  description: string,
  category: Category,
  priority: Priority,
  street: string,
  building: string,
];

const offset = (index: number, scale: number) =>
  ((index % 5) - 2) * scale + ((Math.floor(index / 5) % 3) - 1) * scale * 0.35;

function seedCluster(
  district: string,
  centerLng: number,
  centerLat: number,
  templates: Template[],
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const [title, description, category, priority, street, building] =
      templates[i % templates.length];
    const request = addRequest(
      REQUESTERS[i % REQUESTERS.length],
      `${title} - ${district}`,
      description,
      category,
      priority,
      centerLng + offset(i, 0.0011),
      centerLat + offset(i + 3, 0.0009),
      street,
      String(Number(building) + Math.floor(i / templates.length)),
      i % 4 === 0 ? null : String(((i * 3) % 28) + 1),
    );
    const volunteerId = VOLUNTEERS[i % VOLUNTEERS.length];
    if (i % 13 === 5) Object.assign(request, { status: 'ACCEPTED', volunteerId });
    else if (i % 11 === 4) Object.assign(request, { status: 'COMPLETED', volunteerId });
    else if (i % 7 === 3) Object.assign(request, { status: 'OFFERED', volunteerId });
  }
}

seedCluster(
  'Stare Miasto',
  19.9372,
  50.0616,
  [
    [
      'Odbior recepty z apteki',
      'Potrzebuje odebrac recepte i male opakowanie lekow z apteki przy rynku.',
      'MEDICINE',
      2,
      'Florianska',
      '18',
    ],
    [
      'Zakupy dla seniora',
      'Brakuje mi chleba, mleka i warzyw. Nie moge dzisiaj zejsc po schodach.',
      'GROCERIES',
      2,
      'Slawkowska',
      '7',
    ],
    [
      'Pomoc z cieknacym kranem',
      'W kuchni cieknie kran, potrzebna drobna pomoc albo sprawdzenie uszczelki.',
      'HOME_SUPPORT',
      3,
      'Szewska',
      '12',
    ],
    [
      'Towarzystwo na spacer',
      'Szukam kogos na krotki spacer po Plantach, najlepiej po poludniu.',
      'SOCIAL',
      3,
      'Pijarska',
      '4',
    ],
    [
      'Pozyczenie drabiny',
      'Potrzebuje pozyczyc mala drabine na godzine do wymiany zarowki.',
      'EQUIPMENT_LOAN',
      3,
      'Grodzka',
      '31',
    ],
  ],
  15,
);

seedCluster(
  'Kazimierz',
  19.9446,
  50.0511,
  [
    [
      'Pilne leki z apteki',
      'Koncza mi sie leki na cisnienie, potrzebuje odbioru jeszcze dzisiaj.',
      'MEDICINE',
      1,
      'Miodowa',
      '22',
    ],
    [
      'Podstawowe produkty',
      'Potrzebuje kilku zakupow: ryz, herbata, jogurt i owoce.',
      'GROCERIES',
      2,
      'Starowislna',
      '46',
    ],
    [
      'Naprawa zamka',
      'Zamek w drzwiach zacina sie i boje sie, ze nie wyjde rano.',
      'HOME_SUPPORT',
      2,
      'Krakowska',
      '15',
    ],
    [
      'Pozyczenie wiertarki',
      'Czy ktos moglby pozyczyc wiertarke na jeden wieczor?',
      'EQUIPMENT_LOAN',
      3,
      'Szeroka',
      '9',
    ],
    [
      'Rozmowa przy herbacie',
      'Czuje sie samotnie, chetnie porozmawiam z kims z okolicy.',
      'SOCIAL',
      3,
      'Jozefa',
      '11',
    ],
  ],
  14,
);

seedCluster(
  'Krowodrza',
  19.9244,
  50.0702,
  [
    [
      'Odbior lekow po drodze',
      'Potrzebuje odebrac leki z apteki na Krolewskiej.',
      'MEDICINE',
      2,
      'Krolewska',
      '65',
    ],
    [
      'Male zakupy spozywcze',
      'Prosze o zakup wody, pieczywa i kilku warzyw.',
      'GROCERIES',
      2,
      'Lea',
      '19',
    ],
    [
      'Pomoc z komputerem',
      'Komputer przestal laczyc sie z internetem, potrzebna pomoc techniczna.',
      'HOME_SUPPORT',
      3,
      'Czarnowiejska',
      '48',
    ],
    [
      'Pozyczenie klucza francuskiego',
      'Potrzebuje klucza francuskiego do dokrecenia zaworu.',
      'EQUIPMENT_LOAN',
      3,
      'Mazowiecka',
      '34',
    ],
    [
      'Wyjscie do przychodni',
      'Szukam osoby, ktora odprowadzi mnie do przychodni.',
      'SOCIAL',
      2,
      'Urzędnicza',
      '21',
    ],
  ],
  12,
);

seedCluster(
  'Podgorze',
  19.9521,
  50.0436,
  [
    [
      'Pilny zakup lekarstwa',
      'Lekarz zmienil dawkowanie, potrzebuje wykupic lek jeszcze dzisiaj.',
      'MEDICINE',
      1,
      'Kalwaryjska',
      '32',
    ],
    [
      'Zakupy po pracy',
      'Potrzebuje zakupow spozywczych, lista jest krotka.',
      'GROCERIES',
      2,
      'Limanowskiego',
      '10',
    ],
    [
      'Drobna awaria pradu',
      'Nie dziala jedno gniazdko w kuchni, prosze o sprawdzenie.',
      'HOME_SUPPORT',
      2,
      'Zamoyskiego',
      '41',
    ],
    [
      'Pozyczenie pompki',
      'Potrzebuje pompki rowerowej na dzisiejszy wieczor.',
      'EQUIPMENT_LOAN',
      3,
      'Rynek Podgorski',
      '6',
    ],
    [
      'Pomoc w wyniesieniu kartonow',
      'Mam kilka lekkich kartonow do przeniesienia do piwnicy.',
      'HOME_SUPPORT',
      3,
      'Dlugosza',
      '18',
    ],
  ],
  10,
);
