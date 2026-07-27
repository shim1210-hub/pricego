import { StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

interface KRWResultProps {
  value: string;
  large?: boolean;
}

export function KRWResult({ value, large = false }: KRWResultProps) {
  return (
    <ThemedText style={[styles.result, large && styles.large]}>{value}</ThemedText>
  );
}

const styles = StyleSheet.create({
  result: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  large: {
    fontSize: 56,
    lineHeight: 60,
    color: '#2563eb',
  },
});
