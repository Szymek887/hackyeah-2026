import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDemoAccounts } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { Radius, Spacing } from '@/constants/theme';
import { AccountSelect } from '@/features/auth/components/account-select';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { useAuth } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

/**
 * Login portal. The backend has mock auth only (`X-User-Id` header): the user picks an account
 * from `GET /api/users/demo` or creates a new one (`POST /api/users`).
 */
export function LoginScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('signIn');

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
                Sąsiedzka pomoc po drodze. Zaloguj się, aby zgłosić potrzebę albo pomóc komuś na
                swojej trasie.
              </ThemedText>
            </View>

            <View
              style={[
                styles.panel,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <SegmentedControl value={mode} onChange={setMode} options={MODE_OPTIONS} />
              <Animated.View key={mode} entering={enterScreen}>
                {mode === 'signIn' ? <SignInForm /> : <SignUpForm />}
              </Animated.View>
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

type Mode = 'signIn' | 'signUp';

const MODE_OPTIONS: SegmentOption<Mode>[] = [
  { value: 'signIn', label: 'Mam konto' },
  { value: 'signUp', label: 'Nowe konto' },
];

function SignInForm() {
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

  if (accounts.isPending) return <ActivityIndicator color={theme.primary} />;

  if (accounts.error) {
    return (
      <View style={styles.form}>
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
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Konto</ThemedText>
        <AccountSelect
          accounts={accounts.data}
          value={selectedAccount}
          onChange={(account) => {
            setSelectedId(account.id);
            setError(null);
          }}
        />
      </View>

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
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  footnote: {
    textAlign: 'center',
  },
});
