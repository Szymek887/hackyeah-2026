import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { HelpRequestView } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shown instead of "Chcę pomóc" while the volunteer already has an active task – a volunteer
 * helps with one request at a time (the backend answers 409 otherwise).
 */
export function ActiveTaskNotice({ task }: { task: HelpRequestView }) {
  const theme = useTheme();
  const accepted = task.status === 'ACCEPTED';

  return (
    <Card style={[styles.card, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
      <ThemedText type="defaultBold" style={{ color: theme.warning }}>
        Masz już aktywne zadanie
      </ThemedText>
      <ThemedText>
        {accepted
          ? `Pomagasz przy „${task.title}”. Zakończ je, a potem zgłoś się do kolejnego.`
          : `Czekasz na odpowiedź w sprawie „${task.title}”. Możesz pomagać przy jednym zadaniu naraz.`}
      </ThemedText>
      <Button
        title="Przejdź do mojego zadania"
        variant="secondary"
        onPress={() =>
          router.push(
            accepted
              ? { pathname: '/task/[id]', params: { id: task.id } }
              : { pathname: '/request/[id]', params: { id: task.id } },
          )
        }
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    borderWidth: 1.5,
  },
});
