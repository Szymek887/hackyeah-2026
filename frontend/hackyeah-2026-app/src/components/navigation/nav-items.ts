import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import type { UserRole } from '@/api/types';

/** Routes of app/(tabs). The city panel is not a tab – it is a separate admin-only screen. */
export type TabName = 'index' | 'requests' | 'new' | 'tasks' | 'profile';

export type NavItem = {
  name: TabName;
  href: '/' | '/requests' | '/new' | '/tasks' | '/profile';
  label: string;
  icon: { ios: SFSymbol; android: AndroidSymbol };
  /** The highlighted "Poproś o pomoc" button in the middle. */
  primary?: boolean;
};

const MAP: NavItem = {
  name: 'index',
  href: '/',
  label: 'Mapa',
  icon: { ios: 'map.fill', android: 'map' },
};
const REQUESTS: NavItem = {
  name: 'requests',
  href: '/requests',
  label: 'Zgłoszenia',
  icon: { ios: 'list.bullet', android: 'list' },
};
const ASK_FOR_HELP: NavItem = {
  name: 'new',
  href: '/new',
  label: 'Poproś o pomoc',
  icon: { ios: 'plus', android: 'add' },
  primary: true,
};
const PROFILE: NavItem = {
  name: 'profile',
  href: '/profile',
  label: 'Profil',
  icon: { ios: 'person.fill', android: 'person' },
};

/**
 * Tabs per account type, "Poproś o pomoc" always in the middle.
 * Requesters get three big, simple tabs; volunteers ("potrzebuję i pomagam") also get the map
 * and the list of open requests.
 */
export function navItemsFor(role: UserRole): NavItem[] {
  if (role === 'VOLUNTEER') {
    return [
      MAP,
      REQUESTS,
      ASK_FOR_HELP,
      {
        name: 'tasks',
        href: '/tasks',
        label: 'Zadania',
        icon: { ios: 'checklist', android: 'task_alt' },
      },
      PROFILE,
    ];
  }
  return [
    {
      name: 'index',
      href: '/',
      label: 'Moje prośby',
      icon: { ios: 'house.fill', android: 'home' },
    },
    ASK_FOR_HELP,
    PROFILE,
  ];
}

/** Tabs that exist in app/(tabs) but are not shown for this role (still registered for routing). */
export const ALL_TABS: Pick<NavItem, 'name' | 'href'>[] = [
  { name: 'index', href: '/' },
  { name: 'requests', href: '/requests' },
  { name: 'new', href: '/new' },
  { name: 'tasks', href: '/tasks' },
  { name: 'profile', href: '/profile' },
];
