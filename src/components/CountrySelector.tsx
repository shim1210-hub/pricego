import { Pressable, StyleSheet } from 'react-native';

import { COUNTRY_OPTIONS } from '@/services/exchange-rate.service';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface CountrySelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function CountrySelector({ selectedCode, onSelect }: CountrySelectorProps) {
  return (
    <ThemedView style={styles.container}>
      {COUNTRY_OPTIONS.map((country) => {
        const active = country.code === selectedCode;
        return (
          <Pressable
            key={country.code}
            onPress={() => onSelect(country.code)}
            style={[styles.card, active && styles.activeCard]}>
            <ThemedText style={styles.flag}>{country.flag}</ThemedText>
            <ThemedText type="smallBold">{country.name}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {country.currency}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f7f8fc',
    alignItems: 'flex-start',
    minHeight: 96,
    justifyContent: 'center',
  },
  activeCard: {
    backgroundColor: '#e9f2ff',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  flag: {
    fontSize: 24,
    marginBottom: 8,
  },
});
