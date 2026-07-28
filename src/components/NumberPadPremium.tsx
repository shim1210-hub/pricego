import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface NumberPadPremiumProps {
  onPress: (value: string) => void;
  onBackspace: () => void;
}

export function NumberPadPremium({ onPress, onBackspace }: NumberPadPremiumProps) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['00', '0', '⌫'],
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((value) => (
            <Pressable
              key={value}
              onPress={() => (value === '⌫' ? onBackspace() : onPress(value))}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
              <Text style={styles.keyText}>{value}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: SPACING.md,
    marginVertical: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  key: {
    flex: 1,
    minHeight: 58,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  keyText: {
    ...TYPOGRAPHY.heading,
    color: COLORS.textPrimary,
  },
});
