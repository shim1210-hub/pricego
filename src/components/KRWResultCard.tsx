import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

interface KRWResultCardProps {
  amount: string;
  large?: boolean;
  compact?: boolean;
}

export function KRWResultCard({ amount, large = true, compact = false }: KRWResultCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  // 금액이 길 경우 폰트 크기를 줄임
  const baseFontSize = large ? TYPOGRAPHY.amountKRW.fontSize : 44;
  const widthLimit = Math.max(30, screenWidth - 96);
  const fontSize = Math.min(amount.length > 10 ? 44 : baseFontSize, Math.max(36, widthLimit / Math.max(amount.length * 0.58, 1)));

  return (
    <Card
      variant="elevated"
      style={[
        styles.card,
        compact && styles.compactCard,
        {
          backgroundColor: COLORS.primary,
        },
      ]}>
      <View style={[styles.container, compact && styles.compactContainer]}>
        <Text style={styles.label}>약</Text>
        <Text
          style={[
            styles.amount,
            {
              fontSize,
              lineHeight: fontSize + 8,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}>
          ₩{amount}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xl,
  },
  compactCard: { paddingVertical: SPACING.md },
  compactContainer: { gap: SPACING.xs },
  container: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.body,
    color: COLORS.surface,
    fontWeight: '500' as const,
  },
  amount: {
    ...TYPOGRAPHY.amountKRW,
    color: COLORS.surface,
    fontWeight: '800' as const,
  },
});
