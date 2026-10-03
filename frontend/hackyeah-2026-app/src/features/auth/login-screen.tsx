import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDemoAccounts } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import type { UserProfile } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/session-context';
import { RoleLabels } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';
import { enterItem, enterScreen } from '@/lib/motion';

/**
 * Login portal. The backend has mock auth only (`X-User-Id` header), so the user picks one of the
 * accounts from `GET /api/users/demo`.
 */
export function LoginScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  const accounts = useQuery({ queryKey: ['users', 'demo'], queryFn: getDemoAccounts });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedAccount =
    accounts.data?.find((a) => a.id === selectedId) ?? accounts.data?.[0] ?? null;

  const handleSignIn = async () => {
    if (!selectedAccount) {
      setError('Wybierz konto, aby kontynuować.');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await signIn(selectedAccount.id);
      // Route guard in app/_layout.tsx switches to the app automatically.
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={enterScreen} style={styles.container}>
            <View style={styles.header}>
              <View style={[styles.logo, { backgroundColor: theme.primary }]}>
                <ThemedText type="subtitle" themeColor="onPrimary">
                  P
                </ThemedText>
              </View>
              <ThemedText type="title">Witaj w PoDrodze</ThemedText>
              <ThemedText themeColor="textSecondary">
                Sąsiedzka pomoc po drodze. Wybierz profil, aby zgłosić potrzebę albo pomóc komuś na
                swojej trasie.
              </ThemedText>
            </View>

            <View
              style={[
                styles.panel,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold">Wybierz profil do logowania:</ThemedText>

              {accounts.isPending ? (
                <ActivityIndicator color={theme.primary} />
              ) : accounts.error ? (
                <View style={styles.accounts}>
                  <ThemedText type="small" themeColor="danger">
                    {errorMessage(accounts.error)}
                  </ThemedText>
                  <Button
                    title="Spróbuj ponownie"
                    variant="secondary"
                    inline
                    onPress={() => accounts.refetch()}
                  />
                </View>
              ) : (
                <View style={styles.accounts}>
                  {accounts.data.map((account, index) => (
                    <Animated.View key={account.id} entering={enterItem(index)}>
                      <AccountOption
                        account={account}
                        selected={account.id === selectedAccount?.id}
                        onPress={() => {
                          setSelectedId(account.id);
                          setError(null);
                        }}
                      />
                    </Animated.View>
                  ))}
                </View>
              )}

              {error && (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              )}

              <Button
                title={
                  pending
                    ? 'Logowanie…'
                    : `Zaloguj jako ${selectedAccount?.displayName ?? 'wybrany użytkownik'}`
                }
                size="large"
                disabled={pending || !selectedAccount}
                onPress={handleSignIn}
              />
            </View>

            <ThemedText type="caption" themeColor="textSecondary" style={styles.footnote}>
              Wersja demonstracyjna – tożsamość zweryfikowana z makietą Profilu Zaufanego /
              mObywatel.
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type AccountOptionProps = {
  account: UserProfile;
  selected: boolean;
  onPress: () => void;
};

function AccountOption({ account, selected, onPress }: AccountOptionProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return [
          styles.account,
          {
            borderColor: selected ? theme.primary : theme.border,
            backgroundColor: selected
              ? theme.primarySoft
              : hovered
                ? theme.backgroundMuted
                : theme.backgroundElement,
          },
        ];
      }}>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? theme.primary : theme.border },
          selected && { borderWidth: 6 },
        ]}
      />
      <View style={styles.accountText}>
        <ThemedText type="defaultBold">{account.displayName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {RoleLabels[account.role]}
        </ThemedText>
      </View>
      {account.identityVerified ? (
        <Badge label="Zweryfikowany" color={theme.success} backgroundColor={theme.successSoft} />
      ) : (
        <Badge
          label="Niezweryfikowany"
          color={theme.textSecondary}
          backgroundColor={theme.backgroundMuted}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  container: {
    width: '100%',
    maxWidth: 460,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  panel: {
    padding: Spacing.four,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
  },
  accounts: {
    gap: Spacing.two,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  accountText: {
    flex: 1,
  },
  footnote: {
    textAlign: 'center',
  },
});
