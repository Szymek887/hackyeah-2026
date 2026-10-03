import type { PropsWithChildren } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';

type ScreenPlaceholderProps = PropsWithChildren<{
  title: string;
  owner: 'FE1' | 'FE2' | 'FE3';
  tasks: string[];
}>;

/** Temporary screen body. Replace it when you start working on the screen. */
export function ScreenPlaceholder({ title, owner, tasks, children }: ScreenPlaceholderProps) {
  return (
    <Screen>
      <ThemedText type="title">{title}</ThemedText>
      <Card highlighted>
        <ThemedText type="smallBold" themeColor="primary">
          W budowie · {owner}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {tasks.join(' · ')}
        </ThemedText>
      </Card>
      {children}
    </Screen>
  );
}
