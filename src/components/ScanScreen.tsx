import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BottomNavigationPremium } from '@/components/BottomNavigationPremium';
import { recognizePriceFromImage, type OcrAmountResult } from '@/services/ocr.service';
import type { SupportedCountryCode } from '@/services/types';
import { exchangeRateService } from '@/services/exchange-rate.service';

type ScanTab = 'home' | 'scan' | 'input' | 'settings';
export function ScanScreen({ countryCode, onNavigate }: { countryCode: SupportedCountryCode; onBack: () => void; onNavigate: (tab: ScanTab) => void }) {
  const [result, setResult] = useState<OcrAmountResult | null>(null);
  const [loading, setLoading] = useState(false);
  const pick = async (source: 'camera' | 'gallery') => {
    const response = source === 'camera' ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (response.canceled) return;
    setLoading(true); setResult(null);
    try { setResult(await recognizePriceFromImage(response.assets[0].uri, countryCode, source)); }
    catch { Alert.alert('가격을 찾지 못했습니다', '사진을 다시 촬영해주세요.'); }
    finally { setLoading(false); }
  };
  return <SafeAreaView edges={['top']} style={styles.screen}><View style={styles.screenWithNav}><ScreenHeader title="가격 스캔"/><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>가격 스캔</Text><Text style={styles.description}>가격표나 메뉴판을 촬영하거나 사진을 선택하세요.</Text><Button label="카메라 촬영" icon="📷" onPress={() => void pick('camera')} style={styles.button}/><Button label="갤러리에서 선택" icon="🖼" onPress={() => void pick('gallery')} variant="outline" style={styles.button}/>{loading && <View style={styles.loading}><ActivityIndicator color={COLORS.primary}/><Text style={styles.loadingText}>사진 분석 중...</Text></View>}{result && <Card variant="elevated" style={styles.card}><Text style={styles.label}>인식된 가격</Text>{result.items.map((item, index) => <View key={`${item.currency}-${item.amount}-${index}`} style={styles.item}>{item.translatedMenuName && <Text style={styles.menuName}>{item.translatedMenuName}</Text>}<Text style={styles.amount}>{new Intl.NumberFormat('ko-KR').format(item.amount)} {item.currency}</Text><Text style={styles.krw}>{exchangeRateService.formatKrw(exchangeRateService.calculateKrw(item.amount, item.currency))}</Text></View>)}<Text selectable style={styles.raw}>{result.rawText}</Text><View style={styles.actions}><Button label="다시 촬영" icon="📷" onPress={() => void pick('camera')} style={styles.action}/><Button label="다른 사진" icon="🖼" onPress={() => void pick('gallery')} variant="outline" style={styles.action}/></View></Card>}</ScrollView><BottomNavigationPremium activeTab="scan" onTabChange={onNavigate} onScanPress={() => onNavigate('scan')}/></View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:COLORS.background},screenWithNav:{flex:1,justifyContent:'space-between'},content:{padding:SPACING.xl},title:{...TYPOGRAPHY.heading,color:COLORS.textPrimary},description:{...TYPOGRAPHY.bodyMedium,color:COLORS.textSecondary,marginVertical:SPACING.lg},button:{marginTop:SPACING.md},loading:{alignItems:'center',gap:SPACING.sm,marginTop:SPACING.xl},loadingText:{...TYPOGRAPHY.bodyMedium,color:COLORS.textSecondary},card:{marginTop:SPACING.xl},label:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary},item:{paddingVertical:SPACING.md,borderBottomWidth:1,borderBottomColor:COLORS.border},menuName:{...TYPOGRAPHY.heading,color:COLORS.textPrimary},amount:{...TYPOGRAPHY.amountLocal,color:COLORS.textPrimary,marginVertical:SPACING.sm},krw:{...TYPOGRAPHY.heading,color:COLORS.primary},raw:{...TYPOGRAPHY.caption,color:COLORS.textSecondary,marginTop:SPACING.md},actions:{flexDirection:'row',gap:SPACING.sm,marginTop:SPACING.lg},action:{flex:1}});
