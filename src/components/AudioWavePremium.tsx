import { COLORS, SPACING } from '@/constants/design';
import { StyleSheet, View } from 'react-native';

interface AudioWavePremiumProps {
  active?: boolean;
}

export function AudioWavePremium({ active = false }: AudioWavePremiumProps) {
  const bars = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.5, 0.7];
  const maxHeight = 32;

  return (
    <View style={styles.row}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: height * maxHeight,
              backgroundColor: active ? COLORS.primary : COLORS.disabled,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    marginVertical: SPACING.lg,
  },
  bar: {
    width: 5,
    borderRadius: 2.5,
  },
});
