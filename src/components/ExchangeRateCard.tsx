import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface ExchangeRateCardProps {
  rateText: string;
  updatedAt: string;
  supportOffline?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ExchangeRateCard({ rateText, updatedAt, supportOffline = true, compact = false, style }: ExchangeRateCardProps) {
  return (
    <Card variant="filled" style={[compact && styles.compactCard, style]}>
      <View style={[styles.container, compact && styles.compactContainer]}>
        <Text style={styles.rate}>{rateText}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>마지막 환율 확인: {updatedAt}</Text>
          {supportOffline && (
            <Text style={styles.metaText}>● 오프라인에서도 사용 가능</Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    paddingVertical: SPACING.sm,
  },
  container: {
    gap: SPACING.md,
  },
  compactContainer: {
    gap: SPACING.xs,
  },
  rate: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600' as const,
  },
  meta: {
    gap: SPACING.xs,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
});
