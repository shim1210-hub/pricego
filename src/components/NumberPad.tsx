import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

interface NumberPadProps {
  onPress: (value: string) => void;
  onBackspace: () => void;
}

export function NumberPad({ onPress, onBackspace }: NumberPadProps) {
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['00', '0', '←']];

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((value) => (
            <Pressable
              key={value}
              onPress={() => (value === '←' ? onBackspace() : onPress(value))}
              style={styles.key}>
              <ThemedText style={styles.keyText}>{value}</ThemedText>
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
    gap: 10,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f7f8fc',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 20,
    fontWeight: '700',
  },
});
