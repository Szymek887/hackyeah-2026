import { useLocalSearchParams } from 'expo-router';

import { NewRequestScreen } from '@/features/requests/new-request-screen';
import type { VoiceDraftParams } from '@/features/voice/voice-draft';

export default function NewRequestRoute() {
  const params = useLocalSearchParams<VoiceDraftParams>();
  // A new voice draft remounts the form, so it is filled from the draft.
  return <NewRequestScreen key={params.draftId ?? 'blank'} draft={params} />;
}
