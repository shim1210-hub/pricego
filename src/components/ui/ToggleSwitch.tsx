import { COLORS } from '@/constants/design';
import { Pressable, StyleSheet, View } from 'react-native';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ToggleSwitch({ value, onValueChange }: ToggleSwitchProps) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[styles.container, value ? styles.on : styles.off]}>
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  on: {
    backgroundColor: COLORS.primary,
  },
  off: {
    backgroundColor: COLORS.disabled,
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
});
