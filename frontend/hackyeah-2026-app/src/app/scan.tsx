import { useLocalSearchParams } from 'expo-router';

import { ScannerView } from '@/features/handoff/scanner-view';

export default function ScanScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  return <ScannerView requestId={requestId ?? 'r-1'} />;
}
