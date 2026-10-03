import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

type ScreenPlaceholderProps = PropsWithChildren<{
  title: string;
  owner: 'FE1' | 'FE2' | 'FE3';
  tasks: string[];
}>;

/** Temporary screen body. Replace it when you start working on the screen. */
export function ScreenPlaceholder({ title, owner, tasks, children }: ScreenPlaceholderProps) {
  return (
    <Screen>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Właściciel: {owner}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Zadania: {tasks.join(', ')}
        </ThemedText>
      </ThemedView>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
});
