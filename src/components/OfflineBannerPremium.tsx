import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';

interface OfflineBannerProps {
  visible?: boolean;
}

export function OfflineBannerPremium({ visible = true }: OfflineBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>✈ 오프라인 모드 · 저장된 환율을 사용 중</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.offlineLight,
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  text: {
    ...TYPOGRAPHY.caption,
    color: COLORS.offline,
    fontWeight: '600' as const,
  },
});
