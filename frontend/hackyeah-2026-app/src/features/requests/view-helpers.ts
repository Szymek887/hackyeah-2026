import type { HelpRequestFull, HelpRequestView } from '@/api/types';

/** FULL = the caller is the requester, or the volunteer after acceptance. Only then address/people. */
export const isFull = (view: HelpRequestView): view is HelpRequestFull =>
  view.visibility === 'FULL';

/** "Zwierzyniecka 24/8" */
export function formatAddress({ street, buildingNumber, apartmentNumber }: HelpRequestFull) {
  return `${street} ${buildingNumber}${apartmentNumber ? `/${apartmentNumber}` : ''}`;
}

/** Search query for map apps; the backend stores Kraków addresses without a city field. */
export const mapsQuery = (view: HelpRequestFull) => `${formatAddress(view)}, Kraków`;
