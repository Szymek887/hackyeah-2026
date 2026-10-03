import { Pressable, StyleSheet, View } from 'react-native';

import type { HelpRequestPublic } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { CategoryBadge, PriorityBadge } from '@/features/requests/components/request-badges';
import { timeAgo } from '@/features/requests/labels';

type RequestCardProps = {
  request: HelpRequestPublic;
  onPress?: () => void;
};

export function RequestCard({ request, onPress }: RequestCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={styles.badges}>
          <PriorityBadge priority={request.priority} />
          <CategoryBadge category={request.category} />
          {request.accessibilitySupport && <Badge label="Wsparcie dostępności" />}
        </View>

        <ThemedText type="defaultBold">{request.title}</ThemedText>

        <View style={styles.meta}>
          <ThemedText type="small" themeColor="textSecondary">
            {request.requester.displayName}
            {request.requester.verified && ' · zweryfikowany'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {timeAgo(request.createdAt)}
          </ThemedText>
        </View>
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
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
