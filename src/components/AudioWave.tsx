import { StyleSheet, View } from 'react-native';

interface AudioWaveProps {
  active?: boolean;
}

export function AudioWave({ active = false }: AudioWaveProps) {
  const bars = [0.55, 0.8, 0.4, 0.95, 0.6, 0.75];

  return (
    <View style={styles.row}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            { height: height * 36 },
            active && styles.activeBar,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  bar: {
    width: 6,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  activeBar: {
    backgroundColor: '#2563eb',
  },
});
