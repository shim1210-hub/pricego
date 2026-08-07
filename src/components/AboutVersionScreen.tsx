import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PRICE_GO_THEME } from '@/constants/design';

interface AboutVersionScreenProps { onBack: () => void; }

export function AboutVersionScreen({ onBack }: AboutVersionScreenProps) {
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.layout}>
        <ScreenHeader title="정보 / 버전" showBack onBackPress={onBack} />
        <ScrollView contentContainerStyle={styles.content} showsHorizontalScrollIndicator={false}>
          <Card variant="elevated" style={styles.identityCard}>
            <View accessible={false} style={styles.brandMark}>
              <Text style={styles.brandMarkText}>PG</Text>
            </View>
            <Text style={styles.serviceVersion}>PriceGo v1.0</Text>
            <Text style={styles.appVersion}>Version {appVersion}</Text>
          </Card>

          <View style={styles.productInfo}>
            <Text style={styles.sectionLabel}>PRODUCT INFORMATION</Text>
            <Text style={styles.developer}>Developed by NexDataForge</Text>
            <Text style={styles.description}>
              해외여행 중 음성, 직접 입력, 사진 스캔으로 현지 가격을 원화로 확인하는 모바일 도구입니다.
            </Text>
          </View>

          <Text style={styles.copyright}>© 2026 NexDataForge</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const theme = PRICE_GO_THEME;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.backgroundPage },
  layout: { flex: 1 },
  content: {
    width: '100%', maxWidth: theme.size.contentMaxWidth, alignSelf: 'center', flexGrow: 1,
    paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl,
  },
  identityCard: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xxl },
  brandMark: {
    width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.lg, backgroundColor: theme.color.actionPrimary,
  },
  brandMarkText: { fontSize: 24, fontWeight: '800', color: theme.color.backgroundSurface },
  serviceVersion: { ...theme.typography.heading, color: theme.color.textPrimary, textAlign: 'center' },
  appVersion: { ...theme.typography.bodySmall, color: theme.color.textSecondary, textAlign: 'center' },
  productInfo: {
    marginTop: theme.spacing.xl, padding: theme.spacing.lg, borderWidth: 1,
    borderColor: theme.color.borderDefault, borderRadius: theme.radius.md,
    backgroundColor: theme.color.backgroundSurface,
  },
  sectionLabel: {
    ...theme.typography.captionSmall, marginBottom: theme.spacing.md,
    color: theme.color.actionPrimary, fontWeight: '700',
  },
  developer: {
    ...theme.typography.body, marginBottom: theme.spacing.sm, color: theme.color.textPrimary,
  },
  description: { ...theme.typography.bodyMedium, color: theme.color.textSecondary },
  copyright: {
    ...theme.typography.captionSmall, marginTop: 'auto', paddingTop: theme.spacing.xxxl,
    color: theme.color.textMuted, textAlign: 'center',
  },
});
