import { COLORS, SHADOWS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppTab = 'home' | 'scan' | 'input' | 'history' | 'voice' | 'rate' | 'settings';
interface Props { activeTab: AppTab; onTabChange: (tab: AppTab) => void; onScanPress?: () => void; }

export function BottomNavigationPremium({ activeTab, onTabChange }: Props) {
  const insets = useSafeAreaInsets();
  const tabs = [{ key: 'home', label: '홈', icon: '⌂' }, { key: 'history', label: '기록', icon: '↺' }, { key: 'voice', label: '음성', icon: '●' }, { key: 'rate', label: '환율', icon: '⇄' }, { key: 'settings', label: '설정', icon: '⚙' }] as const;
  return <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}><View style={styles.container}>{tabs.map((tab) => { const active = activeTab === tab.key; const voice = tab.key === 'voice'; return <Pressable key={tab.key} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${tab.label} 열기`} onPress={() => onTabChange(tab.key)} style={({ pressed }) => [styles.tab, voice && styles.voiceTab, pressed && styles.pressed]}><View style={[styles.iconWrap, voice && styles.voiceIconWrap, active && !voice && styles.activeIconWrap]}><Text style={[styles.icon, active && !voice && styles.activeIcon, voice && styles.voiceIcon]}>{voice ? '🎙️' : tab.icon}</Text></View><Text style={[styles.label, active && styles.activeLabel, voice && styles.voiceLabel, voice && active && styles.activeLabel]}>{tab.label}</Text></Pressable>; })}</View></View>;
}
const styles = StyleSheet.create({ safeArea:{backgroundColor:COLORS.surface,borderTopWidth:1,borderTopColor:COLORS.border},container:{flexDirection:'row',height:SIZES.tabBarHeight,paddingHorizontal:SPACING.xs,paddingTop:SPACING.xs},tab:{flex:1,minHeight:60,alignItems:'center',justifyContent:'center',gap:2},voiceTab:{marginTop:-24},pressed:{opacity:.7,transform:[{scale:.96}]},iconWrap:{width:36,height:30,borderRadius:18,alignItems:'center',justifyContent:'center'},activeIconWrap:{backgroundColor:COLORS.primaryLight},voiceIconWrap:{width:58,height:58,borderRadius:29,backgroundColor:COLORS.primary,...SHADOWS.md},icon:{fontSize:21,color:COLORS.textSecondary},activeIcon:{color:COLORS.primary},voiceIcon:{fontSize:27},label:{...TYPOGRAPHY.captionSmall,fontSize:12,color:COLORS.textSecondary},activeLabel:{color:COLORS.primary,fontWeight:'700'},voiceLabel:{color:COLORS.textPrimary,fontWeight:'700',marginTop:2} });
