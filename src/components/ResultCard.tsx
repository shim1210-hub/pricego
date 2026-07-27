import { StyleSheet, View } from 'react-native';

import { CurrencyAmount } from './CurrencyAmount';
import { KRWResult } from './KRWResult';
import { ThemedText } from './themed-text';

interface ResultCardProps {
  localAmount: string;
  localCurrency: string;
  krwAmount: string;
  recognizedText: string;
  rateText: string;
  updatedAt: string;
}

export function ResultCard({
  localAmount,
  localCurrency,
  krwAmount,
  recognizedText,
  rateText,
  updatedAt,
}: ResultCardProps) {
  return (
    <View style={styles.card}>
      <ThemedText type="smallBold" style={styles.title}>알아들었어요 ✓</ThemedText>
      <CurrencyAmount amount={localAmount} currency={localCurrency} accent />
      <ThemedText style={styles.arrow}>↓</ThemedText>
      <KRWResult value={krwAmount} large />
      <View style={styles.metaBox}>
        <ThemedText type="smallBold">들은 내용</ThemedText>
        <ThemedText themeColor="textSecondary">{recognizedText}</ThemedText>
        <ThemedText type="smallBold" style={styles.metaTitle}>적용 환율</ThemedText>
        <ThemedText themeColor="textSecondary">{rateText}</ThemedText>
        <ThemedText type="smallBold" style={styles.metaTitle}>환율 업데이트</ThemedText>
        <ThemedText themeColor="textSecondary">{updatedAt}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  title: {
    color: '#0f766e',
    marginBottom: 12,
  },
  arrow: {
    fontSize: 24,
    marginVertical: 10,
    color: '#64748b',
  },
  metaBox: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    gap: 4,
  },
  metaTitle: {
    marginTop: 8,
  },
});
