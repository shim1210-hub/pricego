import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
}

export function ScreenHeader({
  title,
  showBack,
  onBackPress,
  rightIcon,
  onRightPress,
}: ScreenHeaderProps) {
  const visibleTitle = title?.trim();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.left}>
          {showBack && (
            <Pressable onPress={onBackPress} style={styles.iconButton}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
          )}
        </View>

        {visibleTitle ? <Text style={styles.title}>{visibleTitle}</Text> : <View style={styles.titleSpacer} />}

        <View style={styles.right}>
          {rightIcon && (
            <Pressable onPress={onRightPress} style={styles.iconButton}>
              <Text style={styles.rightIconText}>{rightIcon}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    ...TYPOGRAPHY.heading,
    color: COLORS.textPrimary,
  },
  titleSpacer: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  rightIconText: {
    fontSize: 20,
  },
});
