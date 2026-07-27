import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { COUNTRY_OPTIONS } from '@/services/exchange-rate.service';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface CountrySelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function CountrySelectorPill({ selectedCode, onSelect }: CountrySelectorProps) {
  const selected = COUNTRY_OPTIONS.find((c) => c.code === selectedCode);

  return (
    <Pressable
      onPress={() => onSelect(selectedCode)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={styles.contentContainer}>
        {selected && (
          <>
            <Text style={styles.flag}>{selected.flag}</Text>
            <Text style={styles.name}>{selected.name}</Text>
            <Text style={styles.currency}>·</Text>
            <Text style={styles.currency}>{selected.currency}</Text>
            <Text style={styles.chevron}>▼</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pressed: {
    backgroundColor: COLORS.primaryLight,
  },
  flag: {
    fontSize: 16,
  },
  name: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  currency: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
  },
  chevron: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
});
