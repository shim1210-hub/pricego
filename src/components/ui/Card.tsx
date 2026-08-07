import { COLORS, SHADOWS, SIZES, SPACING } from '@/constants/design';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'outlined', style }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        variant === 'filled' && styles.filled,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: SIZES.cardRadius,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  elevated: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  outlined: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  filled: {
    backgroundColor: COLORS.surfaceAlt,
  },
});
