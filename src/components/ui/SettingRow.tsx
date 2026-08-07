import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PRICE_GO_THEME } from '@/constants/design';

interface SettingRowProps {
  icon?: string;
  title: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
}

export function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  showChevron = false,
  accessibilityLabel,
}: SettingRowProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={styles.left}>
        {icon && <Text accessible={false} style={styles.icon}>{icon}</Text>}
        <View style={styles.textSection}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.right}>
        {typeof value === 'string' ? <Text style={styles.value}>{value}</Text> : value}
        {showChevron && <Text accessible={false} style={styles.chevron}>›</Text>}
      </View>
    </Pressable>
  );
}

const theme = PRICE_GO_THEME;
const styles = StyleSheet.create({
  container: {
    minHeight: theme.size.settingRowMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.borderDefault,
  },
  pressed: { backgroundColor: theme.color.backgroundSubtle },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  icon: { fontSize: 24 },
  textSection: { flex: 1, minWidth: 0 },
  title: { ...theme.typography.body, color: theme.color.textPrimary },
  subtitle: {
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
    color: theme.color.textSecondary,
  },
  right: {
    maxWidth: '46%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  value: {
    ...theme.typography.bodySmall,
    flexShrink: 1,
    color: theme.color.textSecondary,
    textAlign: 'right',
  },
  chevron: { fontSize: 24, color: theme.color.textSecondary },
});
