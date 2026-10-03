import type { Category } from '@/api/types';

/**
 * Self-description shown on the profile. Client-only: the backend has no such fields yet
 * (TODO(backend): add to `UserProfileResponse`). Kept in the session, lost on logout.
 */
export type ProfileDetails = {
  about: string;
  district: string;
  availability: string;
  /** Requester: what they usually need. Volunteer: what they can help with. */
  helpTopics: Category[];
  /** Accessibility notes for the volunteer. */
  accessibilityNotes: string;
};

export const emptyProfileDetails: ProfileDetails = {
  about: '',
  district: '',
  availability: '',
  helpTopics: [],
  accessibilityNotes: '',
};
