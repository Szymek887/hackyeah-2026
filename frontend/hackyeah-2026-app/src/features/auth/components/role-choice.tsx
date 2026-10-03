import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CreateUserDto } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ResidentRole = CreateUserDto['role'];

type RoleChoiceProps = {
  value: ResidentRole;
  onChange: (role: ResidentRole) => void;
};

/**
 * The two kinds of resident accounts. "Potrzebuję pomocy" is the large, warm option – the
 * app is built first for people who need help; "Potrzebuję i pomagam" is the volunteer
 * account (volunteers can ask for help too).
 */
export function RoleChoice({ value, onChange }: RoleChoiceProps) {
  const theme = useTheme();
  const needsHelp = value === 'REQUESTER';

  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: needsHelp }}
        onPress={() => onChange('REQUESTER')}
        style={[
          styles.main,
          {
            borderColor: needsHelp ? theme.accent : theme.border,
            backgroundColor: needsHelp ? theme.accentSoft : theme.backgroundElement,
          },
        ]}>
        <View
          style={[
            styles.icon,
            { backgroundColor: needsHelp ? theme.accent : theme.backgroundMuted },
          ]}>
          <SymbolView
            name={{ ios: 'hand.raised.fill', android: 'front_hand', web: 'front_hand' }}
            size={28}
            tintColor={needsHelp ? theme.onAccent : theme.textSecondary}
          />
        </View>
        <View style={styles.text}>
          <ThemedText type="subtitle" style={needsHelp && { color: theme.accent }}>
            Potrzebuję pomocy
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Zakupy, leki, drobna pomoc w domu – sąsiedzi zrobią to po drodze.
          </ThemedText>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: !needsHelp }}
        onPress={() => onChange('VOLUNTEER')}
        style={[
          styles.secondary,
          {
            borderColor: !needsHelp ? theme.primary : theme.border,
            backgroundColor: !needsHelp ? theme.primarySoft : theme.backgroundElement,
          },
        ]}>
        <SymbolView
          name={{ ios: 'heart.fill', android: 'volunteer_activism', web: 'volunteer_activism' }}
          size={22}
          tintColor={!needsHelp ? theme.primary : theme.textSecondary}
        />
        <View style={styles.text}>
          <ThemedText type="defaultBold" themeColor={!needsHelp ? 'primary' : 'text'}>
            Potrzebuję i pomagam
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Pomagasz innym na swojej trasie, a sam też możesz poprosić o pomoc.
          </ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 2,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
