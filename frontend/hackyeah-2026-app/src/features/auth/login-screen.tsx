import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
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
import type { UserRole } from '@/api/types';
import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { Radius, Spacing } from '@/constants/theme';
import { AccessibilityPanel } from '@/features/accessibility/components/accessibility-panel';
import { AccountSelect } from '@/features/auth/components/account-select';
import { RoleChoice, type ResidentRole } from '@/features/auth/components/role-choice';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { useAuth } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

/**
 * Login portal. The backend has mock auth only (`X-User-Id` header): residents pick an account
 * from `GET /api/users/demo` or create one (`POST /api/users`); the city office has its own entry.
 */
export function LoginScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('signIn');
  const [role, setRole] = useState<ResidentRole>('REQUESTER');
  const isAdmin = mode === 'admin';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={enterScreen} style={styles.container}>
            <View style={styles.header}>
              <BrandLogo size="large" />
              <ThemedText themeColor="textSecondary">
                {isAdmin
                  ? 'Panel miasta: mapa potrzeb i statystyki pomocy sąsiedzkiej.'
                  : 'Sąsiedzka pomoc po drodze. Poproś o pomoc albo pomóż komuś na swojej trasie.'}
              </ThemedText>
            </View>

            {/* First step: make the screen readable for this person before anything else. */}
            <View
              style={[
                styles.panel,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="subtitle" accessibilityRole="header">
                Dopasuj aplikację do siebie
              </ThemedText>
              <AccessibilityPanel />
            </View>

            <Animated.View
              key={isAdmin ? 'admin' : 'resident'}
              entering={enterScreen}
              style={[
                styles.panel,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              {isAdmin ? (
                <>
                  <View style={styles.field}>
                    <ThemedText type="subtitle">Logowanie urzędu miasta</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Dostęp tylko dla pracowników urzędu. Konto miasta widzi wyłącznie panel
                      miasta.
                    </ThemedText>
                  </View>
                  <SignInForm roles={ADMIN_ROLES} buttonLabel="Zaloguj do panelu miasta" />
                </>
              ) : (
                <>
                  <RoleChoice value={role} onChange={setRole} />
                  <SegmentedControl value={mode} onChange={setMode} options={MODE_OPTIONS} />
                  <Animated.View key={mode} entering={enterScreen}>
                    {mode === 'signIn' ? <SignInForm roles={[role]} /> : <SignUpForm role={role} />}
                  </Animated.View>
                </>
              )}
            </Animated.View>

            <Pressable
              accessibilityRole="link"
              onPress={() => setMode(isAdmin ? 'signIn' : 'admin')}
              style={styles.switchLink}>
              <ThemedText type="smallBold" themeColor="primary">
                {isAdmin
                  ? '← Wróć do logowania mieszkańca'
                  : 'Urząd miasta? Zaloguj się do panelu →'}
              </ThemedText>
            </Pressable>

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

type Mode = 'signIn' | 'signUp' | 'admin';

const MODE_OPTIONS: SegmentOption<Mode>[] = [
  { value: 'signIn', label: 'Mam konto' },
  { value: 'signUp', label: 'Nowe konto' },
];

const ADMIN_ROLES: UserRole[] = ['CITY_ADMIN'];

type SignInFormProps = {
  /** Only accounts with these roles are offered. */
  roles: UserRole[];
  buttonLabel?: string;
};

function SignInForm({ roles, buttonLabel }: SignInFormProps) {
  const theme = useTheme();
  const { signIn } = useAuth();
  const accounts = useQuery({ queryKey: ['users', 'demo'], queryFn: getDemoAccounts });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const options = (accounts.data ?? []).filter((account) => roles.includes(account.role));
  const selectedAccount = options.find((a) => a.id === selectedId) ?? options[0] ?? null;

  const handleSignIn = async () => {
    if (!selectedAccount) {
      setError('Wybierz konto, aby kontynuować.');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await signIn(selectedAccount.id);
      router.replace('/');
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

  if (options.length === 0) {
    return (
      <ThemedText themeColor="textSecondary">
        Brak kont tego typu. Załóż nowe konto w zakładce „Nowe konto”.
      </ThemedText>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Konto</ThemedText>
        <AccountSelect
          accounts={options}
          value={selectedAccount}
          onChange={(account) => {
            setSelectedId(account.id);
            setError(null);
          }}
        />
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {error}
        </ThemedText>
      )}

      <Button
        title={
          pending
            ? 'Logowanie…'
            : (buttonLabel ??
              `Zaloguj jako ${selectedAccount?.displayName ?? 'wybrany użytkownik'}`)
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
    maxWidth: 520,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
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
  switchLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  footnote: {
    textAlign: 'center',
  },
});
