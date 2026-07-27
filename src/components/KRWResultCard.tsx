import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

interface KRWResultCardProps {
  amount: string;
}

export function KRWResultCard({ amount }: KRWResultCardProps) {
  const screenWidth = Dimensions.get('window').width;
  // 금액이 길 경우 폰트 크기를 줄임
  const fontSize = amount.length > 10 ? 44 : TYPOGRAPHY.amountKRW.fontSize;

  return (
    <Card
      variant="elevated"
      style={[
        styles.card,
        {
          backgroundColor: COLORS.primary,
        },
      ]}>
      <View style={styles.container}>
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
          adjustsFontSizeToFit>
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
