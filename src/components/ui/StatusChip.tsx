import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';

interface StatusChipProps {
  label: string;
  type?: 'success' | 'warning' | 'info' | 'error';
  icon?: string;
}

export function StatusChip({ label, type = 'info', icon }: StatusChipProps) {
  const bgColor =
    type === 'success'
      ? COLORS.successLight
      : type === 'warning'
        ? COLORS.warningLight
        : type === 'error'
          ? '#FEE2E2'
          : COLORS.primaryLight;

  const textColor =
    type === 'success'
      ? COLORS.success
      : type === 'warning'
        ? COLORS.warning
        : type === 'error'
          ? '#DC2626'
          : COLORS.primary;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {icon && <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '600' as const,
  },
});
