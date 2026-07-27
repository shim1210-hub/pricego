import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface MicButtonProps {
  size?: number;
  listening?: boolean;
  onPress: () => void;
}

export function MicButton({ size = 140, listening = false, onPress }: MicButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      <ThemedView
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          listening && styles.listening,
        ]}>
        <ThemedText style={styles.icon}>{listening ? '🎙️' : '🎤'}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
  listening: {
    backgroundColor: '#f97316',
  },
  icon: {
    fontSize: 56,
    color: '#ffffff',
  },
});
