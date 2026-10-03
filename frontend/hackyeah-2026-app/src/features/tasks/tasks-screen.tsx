import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { errorMessage } from '@/api/errors';
import type { HelpRequestView } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { RatingsSummary } from '@/features/tasks/components/ratings-summary';
import { TaskCard } from '@/features/tasks/components/task-card';
import {
  TASK_TABS,
  TaskTabLabels,
  groupTasks,
  useMyTasks,
  type TaskTab,
} from '@/features/tasks/hooks';
import { useTheme } from '@/hooks/use-theme';
import { enterItem, exitItem, layoutTransition } from '@/lib/motion';

const EMPTY_TEXT: Record<TaskTab, string> = {
  active: 'Nie masz teraz żadnych zadań w trakcie.',
  done: 'Zadania pojawią się tu po zeskanowaniu kodu QR.',
  ratings: 'Nic nie czeka na ocenę.',
};

export function TasksScreen() {
  const theme = useTheme();
  const { role } = useSession();
  // `?tab=active` lets other screens (e.g. the new request form) open a specific tab.
  const params = useLocalSearchParams<{ tab?: TaskTab }>();
  const [selected, setSelected] = useState<TaskTab | null>(null);
  const tab = selected ?? (params.tab && TASK_TABS.includes(params.tab) ? params.tab : 'active');
  const { data = [], isPending, error } = useMyTasks();

  if (role === 'CITY_ADMIN') {
    return (
      <Screen>
        <ThemedText type="title">Moje zadania</ThemedText>
        <Card highlighted>
          <ThemedText>
            Konto miasta nie obsługuje zgłoszeń. Statystyki są w panelu miasta.
          </ThemedText>
          <Button title="Otwórz panel miasta" inline onPress={() => router.push('/dashboard')} />
        </Card>
      </Screen>
    );
  }

  const groups = groupTasks(data);
  const tasks: Record<TaskTab, HelpRequestView[]> = {
    active: groups.active,
    done: groups.done,
    ratings: groups.toRate,
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">Moje zadania</ThemedText>
        <ThemedText themeColor="textSecondary">
          {role === 'VOLUNTEER'
            ? 'Zgłoszenia, którym pomagasz. Zakończysz je, skanując kod QR u osoby potrzebującej.'
            : 'Twoje zgłoszenia. Pokaż kod QR wolontariuszowi, aby potwierdzić otrzymaną pomoc.'}
        </ThemedText>
      </View>

      <SegmentedControl
        value={tab}
        onChange={setSelected}
        options={TASK_TABS.map((value) => ({
          value,
          label: TaskTabLabels[value],
          count: tasks[value].length,
        }))}
      />

      {isPending && <ActivityIndicator color={theme.primary} />}
      {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}

      <FlatList
        // Remount on tab change so the entrance animation plays for the new tab.
        key={tab}
        data={tasks[tab]}
        keyExtractor={(task) => String(task.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          tab === 'ratings' ? (
            <View style={styles.ratingsHeader}>
              <RatingsSummary ratedCount={groups.rated.length} />
              {tasks.ratings.length > 0 && (
                <ThemedText type="smallBold">Czekają na ocenę</ThemedText>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          isPending ? null : (
            <Card highlighted style={styles.empty}>
              <ThemedText themeColor="textSecondary">{EMPTY_TEXT[tab]}</ThemedText>
              {tab === 'active' && role === 'REQUESTER' && (
                <Button
                  title="Dodaj zgłoszenie"
                  variant="secondary"
                  inline
                  onPress={() => router.push('/new')}
                />
              )}
            </Card>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterItem(index)} exiting={exitItem} layout={layoutTransition}>
            <TaskCard task={item} />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  ratingsHeader: {
    gap: Spacing.three,
  },
  empty: {
    alignItems: 'flex-start',
  },
});
