import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

interface ExchangeRateInfoProps {
  rateText: string;
  updatedAt: string;
  statusText: string;
}

export function ExchangeRateInfo({ rateText, updatedAt, statusText }: ExchangeRateInfoProps) {
  return (
    <View style={styles.card}>
      <ThemedText type="smallBold">{rateText}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.meta}>
        최근 업데이트 {updatedAt}
      </ThemedText>
      <ThemedText type="small" style={styles.status}>
        {statusText}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f7f8fc',
    alignItems: 'center',
  },
  meta: {
    marginTop: 4,
  },
  status: {
    marginTop: 8,
    color: '#0f766e',
  },
});
