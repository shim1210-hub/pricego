import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface NumberPadPremiumProps {
  onPress: (value: string) => void;
  onBackspace: () => void;
  compact?: boolean;
}

export function NumberPadPremium({ onPress, onBackspace, compact = false }: NumberPadPremiumProps) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['00', '0', '⌫'],
  ];

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, compact && styles.compactRow]}>
          {row.map((value) => (
            <Pressable
              key={value}
              onPress={() => (value === '⌫' ? onBackspace() : onPress(value))}
              style={({ pressed }) => [styles.key, compact && styles.compactKey, pressed && styles.keyPressed]}>
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
    rowGap: SPACING.xs,
    marginVertical: SPACING.md,
  },
  // Keep the keys unchanged while reclaiming vertical space between rows.
  compactContainer: { rowGap: 0, marginVertical: SPACING.xs },
  row: {
    flexDirection: 'row',
    columnGap: SPACING.sm,
  },
  compactRow: { columnGap: SPACING.xs },
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
  compactKey: { minHeight: 54, paddingVertical: SPACING.xs },
  keyText: {
    ...TYPOGRAPHY.heading,
    color: COLORS.textPrimary,
  },
});
