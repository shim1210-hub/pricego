import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';

interface ExchangeRateCardProps {
  rateText: string;
  updatedAt: string;
  supportOffline?: boolean;
  compact?: boolean;
}

export function ExchangeRateCard({ rateText, updatedAt, supportOffline = true, compact = false }: ExchangeRateCardProps) {
  return (
    <Card variant="filled" style={compact && styles.compactCard}>
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
