import { Pressable, StyleSheet, View } from 'react-native';

import type { HelpRequestListItem } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { CategoryBadge, PriorityBadge } from '@/features/requests/components/request-badges';
import { timeAgo } from '@/features/requests/labels';

type RequestCardProps = {
  request: HelpRequestListItem;
  onPress?: () => void;
};

/** List item from `/nearby` or `/along-route`: public data only, no requester identity. */
export function RequestCard({ request, onPress }: RequestCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={styles.badges}>
          <PriorityBadge priority={request.priority} />
          <CategoryBadge category={request.category} />
        </View>

        <ThemedText type="defaultBold">{request.title}</ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {timeAgo(request.createdAt)}
        </ThemedText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
