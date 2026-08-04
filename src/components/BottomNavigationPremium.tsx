import { COLORS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props { activeTab: 'home' | 'scan' | 'input' | 'settings'; onTabChange: (tab: Props['activeTab']) => void; onScanPress?: () => void; }
export function BottomNavigationPremium({ activeTab, onTabChange, onScanPress }: Props) {
  const insets = useSafeAreaInsets();
  const tabs = [{ key: 'home', label: '홈', icon: '🏠' }, { key: 'scan', label: '스캔', icon: '📄' }, { key: 'input', label: '직접입력', icon: '⌨' }, { key: 'settings', label: '설정', icon: '⚙' }] as const;
  return <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}><View style={styles.container}>{tabs.map((tab) => <Pressable key={tab.key} onPress={() => tab.key === 'scan' ? onScanPress?.() : onTabChange(tab.key)} style={styles.tab}><Text style={styles.icon}>{tab.icon}</Text><Text style={[styles.label, activeTab === tab.key && styles.activeLabel]}>{tab.label}</Text></Pressable>)}</View></View>;
}
const styles = StyleSheet.create({ safeArea:{backgroundColor:COLORS.surface,borderTopWidth:1,borderTopColor:COLORS.border}, container:{flexDirection:'row',justifyContent:'space-around',paddingVertical:SPACING.sm,minHeight:SIZES.tabBarHeight}, tab:{alignItems:'center',justifyContent:'center',gap:SPACING.xs,flex:1}, icon:{fontSize:22}, label:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary}, activeLabel:{color:COLORS.primary,fontWeight:'700' as const} });
