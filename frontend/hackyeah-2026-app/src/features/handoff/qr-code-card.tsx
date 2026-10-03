import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type QrCodeCardProps = {
  token: string;
  expiresAt?: string;
  compact?: boolean;
};

export function QrCodeCard({ token, expiresAt: _expiresAt, compact = false }: QrCodeCardProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrSize = compact ? 160 : 210;

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Jednorazowy kod odbioru
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
        Pokaż ten kod wolontariuszowi, aby potwierdzić bezpieczne dostarczenie pomocy.
      </ThemedText>

      <View style={styles.qrWrapper}>
        <QRCode
          value={token}
          size={qrSize}
          color="#000000"
          backgroundColor="#ffffff"
          quietZone={8}
        />
      </View>

      <ThemedView style={styles.tokenBox}>
        <ThemedText type="code" style={styles.tokenText}>
          {token}
        </ThemedText>
      </ThemedView>

      <ThemedText
        type="small"
        onPress={handleCopy}
        style={{ color: copied ? theme.success : theme.primary, textAlign: 'center' }}>
        {copied ? 'Kod skopiowany' : 'Kod awaryjny (do przepisania)'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
  },
  title: {
    fontSize: 18,
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenBox: {
    backgroundColor: '#ffffff',
    borderColor: '#D9D9E0',
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  tokenText: {
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#000000',
    fontSize: 14,
  },
});
