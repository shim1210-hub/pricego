import { COLORS, SIZES, SPACING } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface MicButtonProps {
  listening?: boolean;
  onPress: () => void;
  size?: number;
}

export function MicButtonPremium({ listening = false, onPress, size = SIZES.micButtonSize }: MicButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      {/* Outer Ring */}
      <View
        style={[
          styles.outerRing,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: listening ? COLORS.primary : COLORS.primaryLight,
          },
        ]}
      />

      {/* Main Button */}
      <View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: COLORS.primary,
          },
          listening && styles.listeningButton,
        ]}>
        <Text style={styles.icon}>🎤</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
  },
  outerRing: {
    position: 'absolute',
    backgroundColor: COLORS.primaryLight,
    opacity: 0.4,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    ...{
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  listeningButton: {
    backgroundColor: '#F97316',
  },
  icon: {
    fontSize: 56,
  },
});
