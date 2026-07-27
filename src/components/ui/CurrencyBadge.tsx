import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';

interface CurrencyBadgeProps {
  flag: string;
  currency: string;
  amount?: string;
}

export function CurrencyBadge({ flag, currency, amount }: CurrencyBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.flag}>{flag}</Text>
      <View style={styles.textSection}>
        <Text style={styles.currency}>{currency}</Text>
        {amount && <Text style={styles.amount}>{amount}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  flag: {
    fontSize: 20,
  },
  textSection: {
    flexDirection: 'column',
  },
  currency: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
  },
  amount: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '700' as const,
  },
});
