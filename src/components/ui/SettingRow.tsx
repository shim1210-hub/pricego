import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SettingRowProps {
  icon?: string;
  title: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  showChevron = false,
}: SettingRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={styles.left}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <View style={styles.textSection}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.right}>
        {typeof value === 'string' ? <Text style={styles.value}>{value}</Text> : value}
        {showChevron && <Text style={styles.chevron}>›</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pressed: {
    backgroundColor: COLORS.surfaceAlt,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  icon: {
    fontSize: 24,
  },
  textSection: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  right: {
    maxWidth: '46%',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  value: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
});
