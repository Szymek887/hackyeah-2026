import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';

export default function ActiveTaskScreen() {
  return (
    <ScreenPlaceholder
      title="Aktywne zadanie"
      owner="FE3"
      tasks={['F3.1 kod QR u potrzebującego', 'widok handoffu']}
    />
  );
}
