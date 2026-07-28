import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { COUNTRY_OPTIONS } from '@/services/exchange-rate.service';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

interface CountrySelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function CountrySelectorPill({ selectedCode, onSelect }: CountrySelectorProps) {
  const [visible, setVisible] = useState(false);
  const selected = COUNTRY_OPTIONS.find((c) => c.code === selectedCode);

  return (
    <>
    <Pressable
      onPress={() => setVisible(true)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={styles.contentContainer}>
        {selected && (
          <>
            <Text style={styles.flag}>{selected.flag}</Text>
            <Text style={styles.name}>{selected.name}</Text>
            <Text style={styles.currency}>·</Text>
            <Text style={styles.currency}>{currencyLabel(selected.currency)}</Text>
            <Text style={styles.chevron}>▼</Text>
          </>
        )}
      </View>
    </Pressable>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setVisible(false)}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>여행 국가 선택</Text>
          {COUNTRY_OPTIONS.map((country) => (
            <Pressable
              key={country.code}
              onPress={() => { onSelect(country.code); setVisible(false); }}
              style={[styles.option, country.code === selectedCode && styles.selectedOption]}>
              <Text style={styles.optionFlag}>{country.flag}</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionName}>{country.name}</Text>
                <Text style={styles.optionCurrency}>{currencyLabel(country.currency)}</Text>
              </View>
              {country.code === selectedCode && <Text style={styles.check}>✓</Text>}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
    </>
  );
}

function currencyLabel(currency: string) {
  return ({ VND: '베트남 동', JPY: '일본 엔', CNY: '중국 위안', USD: '미국 달러', KRW: '대한민국 원' } as Record<string, string>)[currency] ?? currency;
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
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: SPACING.xl, backgroundColor: 'rgba(15, 23, 42, 0.42)' },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  modalTitle: { ...TYPOGRAPHY.heading, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, borderRadius: RADIUS.md },
  selectedOption: { backgroundColor: COLORS.primaryLight },
  optionFlag: { fontSize: 28, width: 44 },
  optionText: { flex: 1 },
  optionName: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, fontWeight: '700' as const },
  optionCurrency: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  check: { fontSize: 24, color: COLORS.primary },
});
