import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';

interface LocalCurrencyCardProps {
  amount: string;
  currency: string;
  flag: string;
}

export function LocalCurrencyCard({ amount, currency, flag }: LocalCurrencyCardProps) {
  return (
    <Card variant="outlined">
      <View style={styles.container}>
        <View style={styles.left}>
          <Text style={styles.label}>현지 통화</Text>
          <Text style={styles.amount}>{amount}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.flag}>{flag}</Text>
          <Text style={styles.currency}>{currency}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flex: 1,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  amount: {
    ...TYPOGRAPHY.amountLocal,
    color: COLORS.textPrimary,
  },
  right: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  flag: {
    fontSize: 28,
  },
  currency: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
  },
});
