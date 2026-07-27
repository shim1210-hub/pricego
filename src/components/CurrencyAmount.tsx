import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

interface CurrencyAmountProps {
  amount: string;
  currency: string;
  accent?: boolean;
}

export function CurrencyAmount({ amount, currency, accent = false }: CurrencyAmountProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        현지 통화
      </ThemedText>
      <ThemedText style={[styles.amount, accent && styles.accent]}>{`${amount} ${currency}`}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  amount: {
    fontSize: 24,
    marginTop: 4,
    fontWeight: '700',
  },
  accent: {
    fontSize: 42,
    color: '#2563eb',
  },
});
