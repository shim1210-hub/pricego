import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

interface BottomNavigationProps {
  activeTab: 'home' | 'input' | 'settings';
  onTabChange: (tab: 'home' | 'input' | 'settings') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { key: 'home', label: '듣기', icon: '🎤' },
    { key: 'input', label: '직접입력', icon: '⌨' },
    { key: 'settings', label: '설정', icon: '⚙' },
  ] as const;

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onTabChange(tab.key)} style={styles.tab}>
            <ThemedText style={[styles.icon, active && styles.activeIcon]}>{tab.icon}</ThemedText>
            <ThemedText style={[styles.label, active && styles.activeLabel]}>{tab.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    backgroundColor: '#ffffff',
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
  },
  activeIcon: {
    color: '#2563eb',
  },
  activeLabel: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
