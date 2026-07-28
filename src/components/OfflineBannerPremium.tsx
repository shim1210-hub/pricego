import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';

interface OfflineBannerProps {
  visible?: boolean;
  message?: string;
}

export function OfflineBannerPremium({ visible = true, message = '인터넷 연결이 없어 최근 환율을 사용하고 있어요.' }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
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
