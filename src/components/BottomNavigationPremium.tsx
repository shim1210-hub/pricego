import { COLORS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BottomNavigationPremiumProps {
  activeTab: 'home' | 'input' | 'settings';
  onTabChange: (tab: 'home' | 'input' | 'settings') => void;
}

export function BottomNavigationPremium({ activeTab, onTabChange }: BottomNavigationPremiumProps) {
  const tabs = [
    { key: 'home', label: '듣기', icon: '🎤' },
    { key: 'input', label: '직접입력', icon: '⌨️' },
    { key: 'settings', label: '설정', icon: '⚙️' },
  ] as const;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}>
              <Text style={[styles.icon, active && styles.activeIcon]}>{tab.icon}</Text>
              <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    height: SIZES.tabBarHeight,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  tabPressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
  },
  activeIcon: {
    opacity: 1,
  },
  activeLabel: {
    color: COLORS.primary,
    fontWeight: '600' as const,
  },
});
