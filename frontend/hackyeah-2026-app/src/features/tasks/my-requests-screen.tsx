import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import type { HelpRequestView } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { TaskCard } from '@/features/tasks/components/task-card';
import { groupTasks, turnOf, useMyTasks } from '@/features/tasks/hooks';
import { useTheme } from '@/hooks/use-theme';

/** Finished requests shown before "Pokaż wszystkie". */
const DONE_PREVIEW = 3;

/**
 * "Moje prośby" for a person who needs help: one calm, scrolling overview instead of the
 * volunteer's task screen (tabs, voice bar, animated list). Three fixed sections – things to do,
 * things waiting for someone else, finished – so nothing jumps around when it opens.
 */
export function MyRequestsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data = [], isPending, error, refetch } = useMyTasks();
  const [showAllDone, setShowAllDone] = useState(false);

  const groups = groupTasks(data);
  const mine = groups.active.filter((task) => turnOf(task) === 'you');
  const waiting = groups.active.filter((task) => turnOf(task) !== 'you');
  // Completed but not rated yet is "your move" (rate), so it is listed above, not here.
  const done = groups.done.filter((task) => task.status !== 'COMPLETED');
  const toRate = groups.done.filter((task) => task.status === 'COMPLETED');
  const yourMove = [...mine, ...toRate];

  const refresh = () =>
    Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['users', 'me'] })]);

  return (
    <Screen scroll onRefresh={refresh}>
      <View style={styles.header}>
        <ThemedText type="title" accessibilityRole="header">
          Moje prośby
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Tu widzisz swoje zgłoszenia. Gdy wolontariusz przyjdzie, pokaż mu kod QR.
        </ThemedText>
      </View>

      {isPending && <ActivityIndicator color={theme.primary} />}
      {error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {errorMessage(error)}
        </ThemedText>
      )}

      {!isPending && data.length === 0 && (
        <Card highlighted style={styles.empty}>
          <ThemedText type="defaultBold">Nie masz jeszcze żadnych próśb</ThemedText>
          <ThemedText themeColor="textSecondary">
            Napisz albo powiedz, czego potrzebujesz – sąsiedzi pomogą po drodze.
          </ThemedText>
          <Button title="Poproś o pomoc" size="large" onPress={() => router.push('/new')} />
        </Card>
      )}

      <Section title="Twój ruch" hint="Te prośby czekają na Ciebie." tasks={yourMove} accent />
      <Section
        title="Oczekujące"
        hint="Nic nie musisz robić – czekasz na wolontariusza."
        tasks={waiting}
      />
      <Section
        title="Zakończone"
        hint="Pomoc, którą już otrzymałeś."
        tasks={showAllDone ? done : done.slice(0, DONE_PREVIEW)}
        count={done.length}
      />
      {done.length > DONE_PREVIEW && (
        <Button
          title={showAllDone ? 'Pokaż mniej' : `Pokaż wszystkie zakończone (${done.length})`}
          variant="ghost"
          onPress={() => setShowAllDone((current) => !current)}
        />
      )}
    </Screen>
  );
}

type SectionProps = {
  title: string;
  hint: string;
  tasks: HelpRequestView[];
  /** Total when only part of the list is shown. */
  count?: number;
  accent?: boolean;
};

function Section({ title, hint, tasks, count, accent = false }: SectionProps) {
  const theme = useTheme();
  if (tasks.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader} accessibilityRole="header">
        <ThemedText
          type="subtitle"
          themeColor={accent ? undefined : 'textSecondary'}
          style={accent ? { color: theme.accent } : undefined}>
          {title} ({count ?? tasks.length})
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </View>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  empty: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    gap: Spacing.half,
    paddingTop: Spacing.two,
  },
});
