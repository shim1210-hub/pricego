import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props { title?: string; showBack?: boolean; onBackPress?: () => void; rightIcon?: string; onRightPress?: () => void; }
export function ScreenHeader({ title, showBack, onBackPress, rightIcon, onRightPress }: Props) {
  return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.container}>
    <View style={styles.side}>{showBack && <Pressable onPress={onBackPress} style={styles.iconButton}><Text style={styles.icon}>‹</Text></Pressable>}</View>
    <Text style={styles.title}>{title ?? ''}</Text>
    <View style={styles.side}>{rightIcon && <Pressable onPress={onRightPress} style={styles.iconButton}><Text style={styles.icon}>{rightIcon}</Text></Pressable>}</View>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  safeArea: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  container: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg },
  side: { width: 48, alignItems: 'center' }, title: { flex: 1, textAlign: 'center', ...TYPOGRAPHY.heading, color: COLORS.textPrimary },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, icon: { fontSize: 28, color: COLORS.textPrimary },
});
