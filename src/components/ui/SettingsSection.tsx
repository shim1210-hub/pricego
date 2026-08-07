import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PRICE_GO_THEME } from '@/constants/design';

interface SettingsSectionProps extends PropsWithChildren {
  title: string;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.surface}>{children}</View>
    </View>
  );
}

const theme = PRICE_GO_THEME;
const styles = StyleSheet.create({
  section: { gap: theme.spacing.sm },
  title: {
    ...theme.typography.caption,
    paddingHorizontal: theme.spacing.xs,
    color: theme.color.textSecondary,
    fontWeight: '700',
  },
  surface: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.borderDefault,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.backgroundSurface,
    ...theme.shadow.surface,
  },
});
