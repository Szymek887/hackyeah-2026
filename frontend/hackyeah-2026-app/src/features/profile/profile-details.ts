import type { Category } from '@/api/types';
import type { DisabilityType } from '@/features/accessibility/accessibility-settings';

/**
 * Self-description shown on the profile. Client-only: the backend has no such fields yet
 * (TODO(backend): add to `UserProfileResponse`). Kept per user in the session (and in
 * `localStorage` on web).
 */
export type ProfileDetails = {
  about: string;
  district: string;
  availability: string;
  /** Requester: what they usually need. Volunteer: what they can help with. */
  helpTopics: Category[];
  /** Declared disabilities / special needs (sign-up or profile). */
  disabilities: DisabilityType[];
  /** Extra needs described in the person's own words, for the volunteer. */
  accessibilityNotes: string;
};

export const emptyProfileDetails: ProfileDetails = {
  about: '',
  district: '',
  availability: '',
  helpTopics: [],
  disabilities: [],
  accessibilityNotes: '',
};
