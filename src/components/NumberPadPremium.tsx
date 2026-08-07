import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function NumberPadPremium({ onPress, onBackspace, compact = false }: { onPress: (value: string) => void; onBackspace: () => void; compact?: boolean }) {
  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['00','0','⌫']];
  return <View style={[styles.container, compact && styles.compact]}>{rows.map((row, rowIndex) => <View key={rowIndex} style={styles.row}>{row.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === '⌫' ? '한 자리 지우기' : `${value} 입력`} onPress={() => value === '⌫' ? onBackspace() : onPress(value)} style={({ pressed }) => [styles.key, compact && styles.compactKey, pressed && styles.pressed]}><Text style={[styles.keyText, value === '⌫' && styles.backspace]}>{value}</Text></Pressable>)}</View>)}</View>;
}
const styles = StyleSheet.create({ container:{width:'100%',gap:8,marginTop:16},compact:{gap:5,marginTop:10},row:{flexDirection:'row',gap:8},key:{flex:1,minHeight:58,borderRadius:RADIUS.lg,backgroundColor:COLORS.surface,alignItems:'center',justifyContent:'center',...SHADOWS.sm},compactKey:{minHeight:50},pressed:{backgroundColor:COLORS.primaryLight},keyText:{...TYPOGRAPHY.heading,color:COLORS.textPrimary},backspace:{color:COLORS.primary} });
