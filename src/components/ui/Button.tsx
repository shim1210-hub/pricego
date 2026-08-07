import { COLORS, RADIUS, SIZES, SPACING } from '@/constants/design';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const buttonHeight = size === 'large' ? SIZES.buttonHeight : 48;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { minHeight: buttonHeight },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <View style={styles.content}>
        {icon && <Text accessible={false} style={styles.icon}>{icon}</Text>}
        <Text
          style={[
            styles.label,
            size === 'large' && styles.labelLarge,
            size === 'medium' && styles.labelMedium,
            size === 'small' && styles.labelSmall,
            variant !== 'primary' && styles.labelSecondary,
          ]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.primaryLight,
  },
  outline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: COLORS.disabledBg,
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    flexShrink: 1,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  labelLarge: {
    fontSize: 16,
  },
  labelMedium: {
    fontSize: 15,
  },
  labelSmall: {
    fontSize: 14,
  },
  labelSecondary: {
    color: COLORS.primary,
  },
});
