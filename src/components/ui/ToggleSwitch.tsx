import { Pressable, StyleSheet, View } from 'react-native';

import { PRICE_GO_THEME } from '@/constants/design';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}

export function ToggleSwitch({ value, onValueChange, accessibilityLabel }: ToggleSwitchProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={[styles.container, value ? styles.on : styles.off]}>
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const theme = PRICE_GO_THEME;
const styles = StyleSheet.create({
  container: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  on: { backgroundColor: theme.color.actionPrimary },
  off: { backgroundColor: theme.color.textMuted },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.color.backgroundSurface,
  },
  thumbOn: { alignSelf: 'flex-end' },
});
