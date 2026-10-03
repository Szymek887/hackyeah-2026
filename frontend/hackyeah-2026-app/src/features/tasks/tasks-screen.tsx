import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { TaskCard } from '@/features/tasks/components/task-card';
import {
  STAGES,
  StageLabels,
  groupByStage,
  useMyTasks,
  type TaskStage,
} from '@/features/tasks/hooks';
import { useTheme } from '@/hooks/use-theme';
import { enterItem, exitItem, layoutTransition } from '@/lib/motion';

const EMPTY_TEXT: Record<TaskStage, string> = {
  pending: 'Brak zadań czekających na start.',
  inProgress: 'Nic nie jest teraz w toku.',
  done: 'Zadania pojawią się tu po zeskanowaniu kodu QR.',
};

export function TasksScreen() {
  const theme = useTheme();
  const { role } = useSession();
  // `?stage=pending` lets other screens (e.g. the new request form) open a specific column.
  const params = useLocalSearchParams<{ stage?: TaskStage }>();
  const [selected, setSelected] = useState<TaskStage | null>(null);
  const stage =
    selected ?? (params.stage && STAGES.includes(params.stage) ? params.stage : 'inProgress');
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

  const groups = groupByStage(data);
  const tasks = groups[stage];

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
        value={stage}
        onChange={setSelected}
        options={STAGES.map((value) => ({
          value,
          label: StageLabels[value],
          count: groups[value].length,
        }))}
      />

      {isPending && <ActivityIndicator color={theme.primary} />}
      {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}

      <FlatList
        // Remount on tab change so the entrance animation plays for the new column.
        key={stage}
        data={tasks}
        keyExtractor={(task) => String(task.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isPending ? null : (
            <Card highlighted style={styles.empty}>
              <ThemedText themeColor="textSecondary">{EMPTY_TEXT[stage]}</ThemedText>
              {stage === 'pending' && role === 'REQUESTER' && (
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
  empty: {
    alignItems: 'flex-start',
  },
});
