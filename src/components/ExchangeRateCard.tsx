import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';

interface ExchangeRateCardProps {
  rateText: string;
  updatedAt: string;
  supportOffline?: boolean;
}

export function ExchangeRateCard({ rateText, updatedAt, supportOffline = true }: ExchangeRateCardProps) {
  return (
    <Card variant="filled">
      <View style={styles.container}>
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
  container: {
    gap: SPACING.md,
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
