import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, Vibration, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { AboutVersionScreen } from '@/components/AboutVersionScreen';
import { AudioWavePremium } from '@/components/AudioWavePremium';
import { BottomNavigationPremium } from '@/components/BottomNavigationPremium';
import { CountrySelectorPill } from '@/components/CountrySelectorPill';
import { ExchangeRateCard } from '@/components/ExchangeRateCard';
import { KRWResultCard } from '@/components/KRWResultCard';
import { LocalCurrencyCard } from '@/components/LocalCurrencyCard';
import { MicButtonPremium } from '@/components/MicButtonPremium';
import { ScanScreen } from '@/components/ScanScreen';
import { NumberPadPremium } from '@/components/NumberPadPremium';
import { OfflineBannerPremium } from '@/components/OfflineBannerPremium';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { StatusChip } from '@/components/ui/StatusChip';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { COLORS, PRICE_GO_THEME, RADIUS, SHADOWS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/design';
import { AppSettingsService, DEFAULT_APP_SETTINGS } from '@/services/app-settings.service';
import { COUNTRY_BY_CODE, COUNTRY_OPTIONS, exchangeRateService } from '@/services/exchange-rate.service';
import { PriceParserService } from '@/services/price-parser.service';
import { recognizePriceFromImage } from '@/services/ocr.service';
import { clearVoiceDiagnosticLogs, recordVoiceDiagnostic, SpeechRecognitionError, SpeechRecognitionService, subscribeVoiceDiagnostics, type VoiceDiagnostic } from '@/services/speech-recognition.service';
import type { AppSettings, CurrencyCode, ExchangeRateSnapshot, SupportedCountryCode } from '@/services/types';

const settingsService = new AppSettingsService();
const speechService = new SpeechRecognitionService();
const parserService = new PriceParserService();
const RECOGNITION_CHECK_THRESHOLD = 300 * 1000;

type CountryDisplay = { code: SupportedCountryCode; name: string; flag: string; currency: CurrencyCode };
type RecognitionState = { amount: number; text: string; currency: CurrencyCode };
export type AppTab = 'home' | 'scan' | 'input' | 'history' | 'voice' | 'rate' | 'settings';

type ScreenName =
  | 'onboarding'
  | 'country-select'
  | 'home'
  | 'listening'
  | 'result'
  | 'recognition-check'
  | 'manual-input'
  | 'exchange-rate'
  | 'show-amount'
  | 'settings'
  | 'history'
  | 'about'
  | 'scan';

export function PriceGoApp() {
  const [screen, setScreen] = useState<ScreenName>('onboarding');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [recognition, setRecognition] = useState<RecognitionState | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'input' | 'settings'>('home');
  const [voiceDiagnostics, setVoiceDiagnostics] = useState<VoiceDiagnostic[]>([]);
  const [showVoiceDiagnostics, setShowVoiceDiagnostics] = useState(false);
  const [rateVersion, setRateVersion] = useState(0);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ amount: number; rawText: string; currency: CurrencyCode } | null>(null);
  const isMountedRef = useRef(true);
  const listeningRef = useRef(false);

  useEffect(() => () => {
    isMountedRef.current = false;
    if (listeningRef.current) speechService.cancel();
  }, []);

  useEffect(() => subscribeVoiceDiagnostics(setVoiceDiagnostics), []);

  useEffect(() => {
    const loadSettings = async () => {
      const parsed = await settingsService.load();
      await exchangeRateService.initialize();
      if (!isMountedRef.current) return;
      setSettings(parsed);
      setScreen(parsed.selectedCountryCode ? 'home' : 'onboarding');
      await refreshRates();
    };

    void loadSettings();
  }, []);

  const navigate = (tab: AppTab) => {
    if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
    if (tab === 'scan') return setScreen('scan');
    if (tab === 'input') return setScreen('manual-input');
    if (tab === 'history') return setScreen('history');
    if (tab === 'voice') return void startListening();
    if (tab === 'rate') return setScreen('exchange-rate');
    if (tab === 'settings') return setScreen('settings');
    setScreen('home');
  };

  const country = COUNTRY_BY_CODE[settings.selectedCountryCode] ?? COUNTRY_BY_CODE.VN;
  const exchangeRate = useMemo(() => exchangeRateService.getRate(country.currency), [country.currency, rateVersion]);
  const krwValue = useMemo(() => exchangeRateService.calculateKrw(Number(manualInput) || 0, country.currency), [country.currency, manualInput]);

  const saveSettings = async (next: AppSettings) => {
    setSettings(next);
    await settingsService.save(next);
  };

  const startListening = async () => {
    if (!isMountedRef.current || listeningRef.current) return;
    if (__DEV__) console.log('[VOICE_01_BUTTON_PRESS]', { currencyCode: settings.selectedCurrency });
    recordVoiceDiagnostic('VOICE_01_BUTTON_PRESS', { currencyCode: settings.selectedCurrency });
    listeningRef.current = true;
    if (settings.vibrationOn) Vibration.vibrate(30);
    setScreen('listening');
    try {
      const result = await speechService.recognize(settings.selectedCountryCode);
      if (result.confidence > 0 && result.confidence < 0.35) {
        if (!isMountedRef.current) return;
        setScreen('home');
        showRetryAlert('잘 듣지 못했어요. 조금 더 크게 다시 말해주세요.', startListening);
        return;
      }
      const currency = COUNTRY_BY_CODE[settings.selectedCountryCode].currency;
      if (__DEV__) {
        console.log('[VOICE_DEBUG]', {
          countryCode: settings.selectedCountryCode,
          currencyCode: currency,
          rawSpeechText: result.recognizedText,
          normalizedText: result.recognizedText.toLowerCase().replace(/[，,]/g, '').replace(/\s+/g, ' ').trim(),
        });
      }
      const recognitionCandidates = [{ text: result.recognizedText, confidence: result.confidence }, ...(result.alternatives ?? []).map((item) => ({ text: item.transcript, confidence: item.confidence }))];
      const parsedCandidates = recognitionCandidates
        .map((candidate) => ({ candidate, parsed: parserService.parseDetailed(candidate.text, currency) }))
        .filter((item) => item.parsed.success)
        .sort((a, b) => b.candidate.confidence - a.candidate.confidence);
      const selected = parsedCandidates[0];
      const parsed = selected?.parsed ?? parserService.parseDetailed(result.recognizedText, currency);
      if (!parsed.success) {
        if (!isMountedRef.current) return;
        setScreen('home');
        showRetryAlert(
          parsed.reason === 'CURRENCY_NOT_FOUND'
            ? "금액과 함께 '동', '엔', '위안', '달러'처럼 말해주세요."
            : '음성을 인식하지 못했습니다. 마이크 권한을 확인한 뒤 다시 말하거나 직접 금액을 입력해주세요.',
          startListening,
        );
        return;
      }

      if (!isMountedRef.current) return;
      if (__DEV__) console.log('[VOICE_DEBUG]', { countryCode: settings.selectedCountryCode, currencyCode: currency, parsedAmount: parsed.result.amount });
      recordVoiceDiagnostic('VOICE_07_PARSED', { currencyCode: currency, parsedAmount: parsed.result.amount });
      setRecognition({ amount: parsed.result.amount, text: selected?.candidate.text ?? result.recognizedText, currency });
      if (settings.vibrationOn) Vibration.vibrate(30);
      if (parsed.result.amount >= RECOGNITION_CHECK_THRESHOLD && currency === 'VND') {
        setScreen('recognition-check');
      } else {
        setScreen('result');
      }
    } catch (error) {
      if (error instanceof SpeechRecognitionError && error.code === 'aborted') return;
      if (!isMountedRef.current) return;
      setScreen('home');
      showRetryAlert(getSpeechErrorMessage(error), startListening);
    } finally {
      listeningRef.current = false;
    }
  };

  const startOcr = async () => {
    Alert.alert('사진으로 금액 인식', '사진을 가져올 방법을 선택하세요.', [
      { text: '카메라', onPress: () => void pickOcrImage('camera') },
      { text: '갤러리', onPress: () => void pickOcrImage('library') },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const pickOcrImage = async (source: 'camera' | 'library') => {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    try {
      setOcrResult(await recognizePriceFromImage(result.assets[0].uri, settings.selectedCountryCode, source === 'library' ? 'gallery' : 'camera'));
    } catch {
      Alert.alert('금액을 찾을 수 없습니다.', '가격이 잘 보이는 사진을 다시 선택해주세요.');
    }
  };

  const confirmAmount = (candidate: number) => {
    setRecognition((prev) => (prev ? { ...prev, amount: candidate } : prev));
    setScreen('result');
  };

  const handleCountrySelect = async (code: SupportedCountryCode) => {
    const nextSettings = {
      ...settings,
      selectedCountryCode: code,
      selectedCurrency: COUNTRY_BY_CODE[code].currency,
    };
    await saveSettings(nextSettings);
  };

  const refreshRates = async () => {
    if (isRefreshingRates) return;
    setIsRefreshingRates(true);
    try {
      await exchangeRateService.refreshLiveRates();
      if (!isMountedRef.current) return;
      setRateVersion((version) => version + 1);
      Alert.alert('환율이 업데이트됐어요.', '최신 환율을 확인했습니다.');
    } catch {
      Alert.alert('인터넷 연결을 확인해주세요.', '기존 환율은 그대로 사용할 수 있어요.');
    } finally {
      setIsRefreshingRates(false);
    }
  };

  const handleManualInputChange = (value: string) => {
    const next = `${manualInput}${value}`.replace(/^0+(?=\d)/, '');
    setManualInput(next);
    setDisplayAmount(next ? new Intl.NumberFormat('ko-KR').format(Number(next)) : '');
  };

  const handleManualBackspace = () => {
    const next = manualInput.slice(0, -1);
    setManualInput(next);
    setDisplayAmount(next ? new Intl.NumberFormat('ko-KR').format(Number(next)) : '');
  };

  const resetManualInput = () => {
    setManualInput('');
    setDisplayAmount('');
  };

  const handleManualCountrySelect = async (code: SupportedCountryCode) => {
    await handleCountrySelect(code);
    resetManualInput();
  };

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <OnboardingScreenPremium onStart={() => setScreen('country-select')} />;
      case 'country-select':
        return (
          <CountrySelectScreenPremium
            selectedCode={settings.selectedCountryCode}
            onSelect={async (code) => {
              await handleCountrySelect(code);
              setScreen(activeTab === 'settings' ? 'settings' : 'home');
            }}
          />
        );
      case 'home':
        return (
          <HomeScreenPremium
            country={country}
            exchangeRate={exchangeRate}
            onCountrySelect={handleCountrySelect}
            onMicPress={startListening}
            onOcrPress={startOcr}
            onScanPress={() => navigate('scan')}
            ocrResult={ocrResult}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') {
                setScreen('scan');
              } else if (tab === 'input') {
                setScreen('manual-input');
              } else if (tab === 'settings') {
                setScreen('settings');
              } else {
                setScreen('home');
              }
            }}
            activeTab={activeTab}
          />
        );
      case 'scan':
        return (
          <ScanScreen
            countryCode={settings.selectedCountryCode}
            onBack={() => setScreen('home')}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') setScreen('scan');
              else if (tab === 'input') setScreen('manual-input');
              else if (tab === 'settings') setScreen('settings');
              else setScreen('home');
            }}
          />
        );
      case 'listening':
        return (
          <ListeningScreenPremium
            country={country}
            onStop={() => {
              speechService.cancel();
              listeningRef.current = false;
              setScreen('home');
            }}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') {
                setScreen('scan');
              } else if (tab === 'input') {
                setScreen('manual-input');
              } else if (tab === 'settings') {
                setScreen('settings');
              } else {
                setScreen('home');
              }
            }}
            activeTab={activeTab}
          />
        );
      case 'result':
        return (
          <ResultScreenPremium
            recognition={recognition}
            country={country}
            exchangeRate={exchangeRate}
            largeResultText={settings.largeResultText}
            onReplay={() => startListening()}
            onShowAmount={() => setScreen('show-amount')}
            onManual={() => setScreen('manual-input')}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') {
                setScreen('scan');
              } else if (tab === 'input') {
                setScreen('manual-input');
              } else if (tab === 'settings') {
                setScreen('settings');
              } else {
                setScreen('home');
              }
            }}
            activeTab={activeTab}
          />
        );
      case 'recognition-check':
        return (
          <RecognitionCheckScreenPremium
            country={country}
            recognition={recognition}
            onConfirm={confirmAmount}
            onReplay={() => startListening()}
            onManual={() => setScreen('manual-input')}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') {
                setScreen('scan');
              } else if (tab === 'input') {
                setScreen('manual-input');
              } else if (tab === 'settings') {
                setScreen('settings');
              } else {
                setScreen('home');
              }
            }}
            activeTab={activeTab}
          />
        );
      case 'manual-input':
        return (
          <ManualInputScreenPremium
            country={country}
            onCountrySelect={handleManualCountrySelect}
            amount={manualInput}
            displayAmount={displayAmount}
            krwAmount={manualInput ? exchangeRateService.formatKrw(krwValue) : ''}
            onChange={handleManualInputChange}
            onBackspace={handleManualBackspace}
            onReset={resetManualInput}
            onBack={() => setScreen('home')}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') {
                setScreen('scan');
              } else if (tab === 'input') {
                setScreen('manual-input');
              } else if (tab === 'settings') {
                setScreen('settings');
              } else {
                setScreen('home');
              }
            }}
            activeTab={activeTab}
          />
        );
      case 'exchange-rate':
        return (
          <ExchangeRateScreenPremium
            country={country}
            exchangeRate={exchangeRate}
            onRefresh={refreshRates}
            refreshing={isRefreshingRates}
            onBack={() => setScreen('settings')}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') {
                setScreen('scan');
              } else if (tab === 'input') {
                setScreen('manual-input');
              } else if (tab === 'settings') {
                setScreen('settings');
              } else {
                setScreen('home');
              }
            }}
            activeTab={activeTab}
          />
        );
      case 'show-amount':
        return recognition ? (
          <ShowAmountScreenPremium
            country={country}
            amount={recognition.amount}
            onBack={() => setScreen('result')}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') setScreen('scan');
              else if (tab === 'input') setScreen('manual-input');
              else if (tab === 'settings') setScreen('settings');
              else setScreen('home');
            }}
          />
        ) : null;
      case 'settings':
        return (
          <SettingsScreenPremium
            settings={settings}
            onBack={() => setScreen('home')}
            onCountryPress={() => setScreen('country-select')}
            onRatePress={() => setScreen('exchange-rate')}
            onAboutPress={() => setScreen('about')}
            onVoiceDiagnostics={() => setShowVoiceDiagnostics(true)}
            onToggle={(key, value) => {
              const next = { ...settings, [key]: value } as AppSettings;
              saveSettings(next);
            }}
            onNavigate={(tab) => {
              if (tab === 'home' || tab === 'scan' || tab === 'input' || tab === 'settings') setActiveTab(tab);
              if (tab === 'history') return setScreen('history');
              if (tab === 'voice') return void startListening();
              if (tab === 'rate') return setScreen('exchange-rate');
              if (tab === 'scan') {
                setScreen('scan');
              } else if (tab === 'input') {
                setScreen('manual-input');
              } else if (tab === 'settings') {
                setScreen('settings');
              } else {
                setScreen('home');
              }
            }}
            activeTab={activeTab}
          />
        );
      case 'history':
        return <HistoryScreenPremium recognition={recognition} country={country} exchangeRate={exchangeRate} onNavigate={navigate} />;
      case 'about':
        return <AboutVersionScreen onBack={() => setScreen('settings')} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      <VoiceDiagnosticsModal
        visible={showVoiceDiagnostics}
        logs={voiceDiagnostics}
        onClose={() => setShowVoiceDiagnostics(false)}
        onClear={clearVoiceDiagnosticLogs}
        onCopy={() => Share.share({ message: formatVoiceDiagnostics(voiceDiagnostics) })}
      />
    </View>
  );
}

function OnboardingScreenPremium({ onStart }: { onStart: () => void }) {
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <ScrollView
        contentContainerStyle={styles.centerContainer}
        scrollEnabled={false}>
        <View style={styles.onboardingContent}>
          <Text style={styles.priceGoLogo}>PriceGo</Text>
          
          <View style={styles.heroSection}>
            <Text style={styles.heroMain}>들리는 가격을</Text>
            <Text style={styles.heroAccent}>바로 원화로</Text>
          </View>

          <View style={styles.micIconSection}>
            <Text style={styles.micIconLarge}>🎤</Text>
          </View>

          <Button
            label="시작하기"
            onPress={onStart}
            style={styles.fullWidth}
          />

          <Text style={styles.helperText}>
            일본어 · 중국어 · 영어 · 베트남어{'\n'}가격 음성을 인식합니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CountrySelectScreenPremium({
  selectedCode,
  onSelect,
}: {
  selectedCode: SupportedCountryCode;
  onSelect: (code: SupportedCountryCode) => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <ScreenHeader
        title="어디를 여행 중인가요?"
        showBack
        onBackPress={() => onSelect(selectedCode)}
      />
      <ScrollView contentContainerStyle={styles.pagePadding}>
        <Text style={styles.subtitle}>
          언어와 통화를 선택하면{'\n'}더 정확하게 인식해요.
        </Text>

        <View style={styles.countryGrid}>
          {COUNTRY_OPTIONS.map((country) => {
            const active = country.code === selectedCode;
            return (
              <Pressable
                key={country.code}
                onPress={() => onSelect(country.code as SupportedCountryCode)}
                style={[
                  styles.countryCard,
                  active && styles.countryCardActive,
                ]}>
                <Text style={styles.countryFlag}>{country.flag}</Text>
                <Text style={styles.countryName}>{country.name}</Text>
                <Text style={styles.countryCurrency}>{currencyLabel(country.currency)}</Text>
                {active && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })}
        </View>

        <Button
          label="계속"
          onPress={() => onSelect(selectedCode)}
          style={styles.fullWidth}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeScreenPremium({
  country, exchangeRate, onMicPress, onOcrPress, onScanPress, ocrResult, onNavigate, activeTab,
}: {
  country: CountryDisplay; exchangeRate: ExchangeRateSnapshot; onCountrySelect: (code: SupportedCountryCode) => void;
  onMicPress: () => void; onOcrPress: () => void; onScanPress: () => void;
  ocrResult: { amount: number; rawText: string; currency: CurrencyCode } | null;
  onNavigate: (tab: AppTab) => void;
  activeTab: 'home' | 'scan' | 'input' | 'settings';
}) {
  const { width, height } = useWindowDimensions();
  const compact = height < 900;
  const micSize = compact ? Math.min(132, width * 0.34) : Math.min(160, width * 0.4);
  const rateDate = exchangeRate.updatedAt.includes('T') ? new Date(exchangeRate.updatedAt).toLocaleDateString('ko-KR') : exchangeRate.updatedAt;
  const quickActions = [
    { icon: '🎙️', label: '음성 인식', onPress: onMicPress }, { icon: '▣', label: '스캔', onPress: onScanPress },
    { icon: '⌨', label: '직접 입력', onPress: () => onNavigate('input') }, { icon: '↺', label: '기록', onPress: () => onNavigate('history') },
  ];
  return <SafeAreaView edges={['top']} style={styles.fullScreen}><View style={styles.screenWithNav}>
    <ScreenHeader title="환율 계산" rightIcon="⚙" rightAccessibilityLabel="설정 열기" onRightPress={() => onNavigate('settings')} />
    <ScrollView contentContainerStyle={[styles.newHomeContent, compact && styles.newHomeContentCompact]} showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="국가 설정 열기" onPress={() => onNavigate('settings')} style={styles.countrySummary}><Text style={styles.countrySummaryFlag}>{country.flag}</Text><View><Text style={styles.countrySummaryName}>{country.name} · {currencyLabel(country.currency)}</Text><Text style={styles.countrySummaryHint}>국가 설정에서 변경</Text></View><Text style={styles.chevron}>›</Text></Pressable>
      <View style={styles.rateSummaryCard}><Text style={styles.cardEyebrow}>오늘 환율</Text><View style={styles.rateSummaryRow}><Text style={styles.rateLocal}>1,000 {country.currency}</Text><Text style={styles.rateEquals}>≈</Text><Text style={styles.rateKrw}>{Math.round(exchangeRate.rateToKrw * 1000)} KRW</Text></View><View style={styles.rateMeta}><Text style={styles.offlineDot}>●</Text><Text style={styles.rateMetaText}>{exchangeRate.source !== 'live' ? '오프라인 사용 가능' : '온라인 환율'}</Text><Text style={styles.rateDate}>{rateDate}</Text></View></View>
      <View style={[styles.voiceSection, compact && styles.voiceSectionCompact]}><MicButtonPremium onPress={onMicPress} size={micSize} /><Text style={styles.voiceTitle}>금액을 말해보세요.</Text><Text style={styles.voiceExamples}>예: 30만동 · 5달러 · 100엔</Text></View>
      {ocrResult && <Card variant="elevated" style={styles.ocrResultCard}><Text style={styles.ocrResultLabel}>사진에서 인식한 금액</Text><Text style={styles.ocrResultAmount}>{new Intl.NumberFormat('ko-KR').format(ocrResult.amount)} {ocrResult.currency}</Text><Text style={styles.ocrResultKrw}>{exchangeRateService.formatKrw(exchangeRateService.calculateKrw(ocrResult.amount, ocrResult.currency))}</Text></Card>}
      <Text style={styles.sectionLabel}>빠른 시작</Text><View style={styles.quickGrid}>{quickActions.map((action) => <Pressable key={action.label} accessibilityRole="button" onPress={action.onPress} style={styles.quickCard}><Text style={styles.quickIcon}>{action.icon}</Text><Text style={styles.quickLabel}>{action.label}</Text></Pressable>)}</View>
      <Pressable onPress={onOcrPress} style={styles.scanHint}><Text style={styles.scanHintText}>▣  사진으로 금액 스캔하기</Text></Pressable><Text style={styles.bottomInfo}>● 오늘 환율 정보 · {exchangeRate.source !== 'live' ? '오프라인 사용 가능' : '최신 정보'}</Text>
    </ScrollView><BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} onScanPress={onScanPress} />
  </View></SafeAreaView>;
}

function HomeScreenLegacy({
  country,
  exchangeRate,
  onCountrySelect,
  onMicPress,
  onOcrPress,
  onScanPress,
  ocrResult,
  onNavigate,
  activeTab,
}: {
  country: CountryDisplay;
  exchangeRate: ExchangeRateSnapshot;
  onCountrySelect: (code: SupportedCountryCode) => void;
  onMicPress: () => void;
  onOcrPress: () => void;
  onScanPress: () => void;
  ocrResult: { amount: number; rawText: string; currency: CurrencyCode } | null;
  onNavigate: (tab: AppTab) => void;
  activeTab: 'home' | 'scan' | 'input' | 'settings';
}) {
  const { width, height } = useWindowDimensions();
  const compact = height < 900;
  const micSize = compact
    ? Math.min(160, Math.max(150, width * 0.4))
    : Math.min(180, Math.max(150, width * 0.42));
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader
          title="환율 계산"
          rightIcon="⚙"
          rightAccessibilityLabel="설정 열기"
          onRightPress={() => onNavigate('settings')}
        />

        <ScrollView
          contentContainerStyle={[styles.homePagePadding, compact && styles.compactHomePagePadding]}
          showsVerticalScrollIndicator={false}>
          <OfflineBannerPremium
            visible={exchangeRate.source !== 'live'}
            message={exchangeRate.source === 'fallback' ? '환율 정보를 불러오지 못해 기본 환율을 사용하고 있어요.' : undefined}
          />

          <CountrySelectorPill
            selectedCode={country.code}
            onSelect={(code) => void onCountrySelect(code as SupportedCountryCode)}
            compact={compact}
          />

          <View style={compact ? styles.compactSpacer : styles.spacer} />

          <View style={styles.homeCenterContent}>
            <MicButtonPremium onPress={onMicPress} size={micSize} />
            <Text accessibilityRole="header" style={[styles.micPromptTitle, compact && styles.compactMicPromptTitle]}>금액을 말해 주세요</Text>
            <Text style={[styles.micPromptDesc, compact && styles.compactMicPromptDesc]}>예) 30만동 · 5달러 · 100엔</Text>
            <Text style={[styles.micPromptTitle, compact && styles.compactMicPromptTitle]}>가격을 들어볼게요</Text>
            <Text style={[styles.micPromptDesc, compact && styles.compactMicPromptDesc]}>
              버튼을 누르고{'\n'}상대방이 말하는 가격을 들려주세요.
            </Text>
            <Button
              label="사진으로 금액 인식"
              onPress={onOcrPress}
              variant="outline"
              size="medium"
              style={styles.homeManualButton}
            />
            <Button
              label="직접 입력"
              onPress={() => onNavigate('input')}
              variant="secondary"
              size="medium"
              style={styles.homeManualButton}
            />
          </View>

          {ocrResult && (
            <Card variant="elevated" style={styles.ocrResultCard}>
              <Text style={styles.ocrResultLabel}>사진에서 인식한 금액</Text>
              <Text style={styles.ocrResultAmount}>{new Intl.NumberFormat('ko-KR').format(ocrResult.amount)} {ocrResult.currency}</Text>
              <Text style={styles.ocrResultKrw}>{exchangeRateService.formatKrw(exchangeRateService.calculateKrw(ocrResult.amount, ocrResult.currency))}</Text>
            </Card>
          )}

          <View style={compact ? styles.compactSpacer : styles.spacer} />

          <ExchangeRateCard
            rateText={`1,000 ${country.currency} ≈ ${Math.round(exchangeRate.rateToKrw * 1000)} KRW`}
            updatedAt={exchangeRate.updatedAt}
            supportOffline
            compact={compact}
            style={styles.homeExchangeRateCard}
          />
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} onScanPress={onScanPress} />
      </View>
    </SafeAreaView>
  );
}

function ListeningScreenPremium({
  country,
  onStop,
  onNavigate,
  activeTab,
}: {
  country: CountryDisplay;
  onStop: () => void;
  onNavigate: (tab: AppTab) => void;
  activeTab: 'home' | 'scan' | 'input' | 'settings';
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader title="PriceGo" />

        <ScrollView contentContainerStyle={styles.voiceStateContent} showsVerticalScrollIndicator={false}>
          <View style={styles.centerContent}>
            <View accessibilityLiveRegion="polite" style={styles.voiceStatusPanel}>
              <StatusChip label="음성 듣는 중" type="info" icon="●" />
              <Text accessibilityRole="header" style={styles.listeningTitle}>듣고 있어요</Text>
              <Text style={styles.listeningDesc}>금액과 통화를 함께 말해 주세요.</Text>
              <Text style={styles.listeningContext}>{country.name} · {currencyLabel(country.currency)}</Text>
            </View>

            <MicButtonPremium listening onPress={onStop} />

            <AudioWavePremium active />

            <Button
              label="중지"
              onPress={onStop}
              variant="outline"
              style={styles.buttonMedium}
            />
          </View>
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} onScanPress={() => onNavigate('scan')} />
      </View>
    </SafeAreaView>
  );
}

function ResultScreenPremium({ recognition, country, exchangeRate, largeResultText, onReplay, onShowAmount, onManual, onNavigate }: { recognition: RecognitionState | null; country: CountryDisplay; exchangeRate: ExchangeRateSnapshot; largeResultText: boolean; onReplay: () => void; onShowAmount: () => void; onManual: () => void; onNavigate: (tab: AppTab) => void; activeTab: 'home' | 'scan' | 'input' | 'settings' }) {
  if (!recognition) return null;
  const krw = exchangeRateService.formatKrw(recognition.amount * exchangeRate.rateToKrw);
  return <SafeAreaView edges={['top']} style={styles.fullScreen}><View style={styles.screenWithNav}><View style={styles.redesignHeader}><Pressable accessibilityRole="button" accessibilityLabel="홈으로 돌아가기" onPress={() => onNavigate('home')} style={styles.redesignHeaderButton}><Text style={styles.redesignBack}>‹</Text></Pressable><Text accessibilityRole="header" style={styles.redesignHeaderTitle}>환산 결과</Text><View style={styles.redesignHeaderButton} /></View><ScrollView style={styles.redesignScroll} contentContainerStyle={styles.redesignContent} showsVerticalScrollIndicator={false}>
    <View style={styles.successPill}><Text style={styles.successPillText}>✓ 금액을 인식했어요</Text></View><View style={styles.resultHero}><Text style={styles.resultCountry}>{country.flag} {country.name}</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.resultLocal}>{recognition.amount.toLocaleString('ko-KR')} {recognition.currency}</Text><Text style={styles.resultDown}>↓</Text><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.resultKrwPremium, largeResultText && styles.resultKrwLarge]}>{krw}</Text></View>
    <View style={styles.infoCard}><View style={styles.infoRow}><Text style={styles.infoLabel}>인식한 말</Text><Text style={styles.infoValue}>{recognition.text}</Text></View><View style={styles.infoRow}><Text style={styles.infoLabel}>적용 환율</Text><Text style={styles.infoValue}>1,000 {country.currency} ≈ {Math.round(exchangeRate.rateToKrw * 1000)} KRW</Text></View></View>
    <Pressable accessibilityRole="button" onPress={onReplay} style={styles.refreshButton}><Text style={styles.refreshButtonText}>🎙️ 다시 말하기</Text></Pressable><View style={styles.secondaryActions}><Pressable accessibilityRole="button" onPress={onManual} style={styles.secondaryPremiumButton}><Text style={styles.secondaryPremiumText}>직접 수정</Text></Pressable><Pressable accessibilityRole="button" onPress={onShowAmount} style={styles.secondaryPremiumButton}><Text style={styles.secondaryPremiumText}>크게 보여주기</Text></Pressable></View>
  </ScrollView><BottomNavigationPremium activeTab="home" onTabChange={onNavigate} /></View></SafeAreaView>;
}

function ResultScreenLegacy({
  recognition,
  country,
  exchangeRate,
  largeResultText,
  onReplay,
  onShowAmount,
  onManual,
  onNavigate,
  activeTab,
}: {
  recognition: RecognitionState | null;
  country: CountryDisplay;
  exchangeRate: ExchangeRateSnapshot;
  largeResultText: boolean;
  onReplay: () => void;
  onShowAmount: () => void;
  onManual: () => void;
  onNavigate: (tab: AppTab) => void;
  activeTab: 'home' | 'scan' | 'input' | 'settings';
}) {
  if (!recognition) return null;
  const localAmount = recognition.amount;
  const krwAmount = exchangeRateService.formatKrw(localAmount * exchangeRate.rateToKrw);

  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader
          title="PriceGo"
          showBack
          onBackPress={() => {}}
          rightIcon="✓"
        />

        <ScrollView contentContainerStyle={styles.resultPagePadding} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View accessibilityLiveRegion="polite">
            <StatusChip label="금액을 확인했어요" type="success" icon="✓" />
          </View>

          <View style={styles.spacer} />

          <Card variant="filled" style={styles.recognitionFeedbackCard}>
            <Text style={styles.detailLabel}>인식된 말</Text>
            <Text style={styles.recognizedSpeech}>“{recognition.text}”</Text>
            <View style={styles.recognitionSummary}>
              <View style={styles.resultMetaColumn}>
                <Text style={styles.detailLabel}>인식 금액</Text>
                <Text style={styles.detailValue}>{new Intl.NumberFormat('ko-KR').format(localAmount)} {recognition.currency}</Text>
              </View>
              <View style={styles.resultMetaColumn}>
                <Text style={styles.detailLabel}>감지 통화</Text>
                <Text style={styles.detailValue}>{currencyLabel(recognition.currency)} · {recognition.currency}</Text>
              </View>
            </View>
          </Card>

          <LocalCurrencyCard
            amount={new Intl.NumberFormat('ko-KR').format(localAmount)}
            currency={country.currency}
            flag={country.flag}
            compact
          />

          <Text style={styles.resultArrowDown}>↓</Text>

          <View
            accessible
            accessibilityLabel={`원화 환산 결과, ${krwAmount}`}
            accessibilityLiveRegion="polite">
            <KRWResultCard
              amount={krwAmount.replace('약 ₩', '').replace(' ', '')}
              large={largeResultText}
              compact
            />
          </View>

          <Card variant="filled" style={styles.resultDetailsCard}>
            <View style={styles.resultMetaRow}>
              <View style={styles.resultMetaColumn}>
                <Text style={styles.detailLabel}>적용 환율</Text>
                <Text style={styles.detailValue}>{`1,000 ${currencyLabel(country.currency)} ≈ ${Math.round(exchangeRate.rateToKrw * 1000)}원`}</Text>
              </View>
              <View style={styles.resultMetaColumn}>
                <Text style={styles.detailLabel}>환율 업데이트</Text>
                <Text style={styles.detailValue}>{exchangeRate.updatedAt}</Text>
              </View>
            </View>
          </Card>

          <View style={styles.spacer} />

          <Button
            label="🎤 다시 듣기"
            onPress={onReplay}
            style={styles.fullWidth}
          />

          <View style={styles.resultButtonRow}>
            <Button
              label="직접 수정"
              onPress={onManual}
              variant="secondary"
              style={styles.resultSecondaryButton}
            />
            <Button
              label="상대방에게 보여주기"
              onPress={onShowAmount}
              variant="secondary"
              style={styles.resultSecondaryButton}
            />
          </View>
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} onScanPress={() => onNavigate('scan')} />
      </View>
    </SafeAreaView>
  );
}

function RecognitionCheckScreenPremium({
  country,
  recognition,
  onConfirm,
  onReplay,
  onManual,
  onNavigate,
  activeTab,
}: {
  country: CountryDisplay;
  recognition: RecognitionState | null;
  onConfirm: (candidate: number) => void;
  onReplay: () => void;
  onManual: () => void;
  onNavigate: (tab: AppTab) => void;
  activeTab: 'home' | 'scan' | 'input' | 'settings';
}) {
  if (!recognition) return null;
  const amount = recognition.amount;
  const candidates = [amount, Math.floor(amount / 10), amount * 10];

  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader title="" showBack onBackPress={onReplay} />

        <ScrollView contentContainerStyle={styles.pagePadding}>
          <StatusChip label="금액 확인 필요" type="warning" icon="!" />
          <Text style={styles.heading}>금액을 다시 확인해 주세요</Text>
          <Text style={styles.subtitle}>아래 금액이 맞나요?</Text>

          <Card variant="filled" style={styles.recognitionFeedbackCard}>
            <Text style={styles.detailLabel}>인식된 말</Text>
            <Text style={styles.recognizedSpeech}>“{recognition.text}”</Text>
            <Text style={styles.reviewHelp}>말씀하신 금액과 통화가 맞는지 선택해 주세요.</Text>
          </Card>

          <View style={styles.spacer} />

          <LocalCurrencyCard
            amount={new Intl.NumberFormat('ko-KR').format(amount)}
            currency={country.currency}
            flag={country.flag}
          />

          <View style={styles.spacer} />

          {candidates.map((candidate, idx) => (
            <Button
              key={candidate}
              label={`${new Intl.NumberFormat('ko-KR').format(candidate)} ${currencyLabel(country.currency)}`}
              onPress={() => onConfirm(candidate)}
              variant={idx === 0 ? 'primary' : 'secondary'}
              style={styles.fullWidth}
            />
          ))}

          <View style={styles.spacer} />

          <Button
            label="🎤 다시 듣기"
            onPress={onReplay}
            variant="outline"
            style={styles.fullWidth}
          />

          <Button
            label="직접 입력하기"
            onPress={onManual}
            variant="secondary"
            style={styles.fullWidth}
          />
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} onScanPress={() => onNavigate('scan')} />
      </View>
    </SafeAreaView>
  );
}

function ManualInputScreenPremium({ country, amount, displayAmount, krwAmount, onChange, onBackspace, onReset, onBack, onNavigate }: { country: CountryDisplay; onCountrySelect: (code: SupportedCountryCode) => void; amount: string; displayAmount: string; krwAmount: string; onChange: (value: string) => void; onBackspace: () => void; onReset: () => void; onBack: () => void; onNavigate: (tab: AppTab) => void; activeTab: 'home' | 'scan' | 'input' | 'settings' }) {
  const compact = useWindowDimensions().height < 900;
  return <SafeAreaView edges={['top']} style={styles.fullScreen}><View style={styles.screenWithNav}><View style={styles.redesignHeader}><Pressable accessibilityRole="button" accessibilityLabel="홈으로 돌아가기" onPress={onBack} style={styles.redesignHeaderButton}><Text style={styles.redesignBack}>‹</Text></Pressable><Text accessibilityRole="header" style={styles.redesignHeaderTitle}>직접 입력</Text><View style={styles.redesignHeaderButton} /></View><ScrollView style={styles.redesignScroll} contentContainerStyle={styles.redesignContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${country.name}, ${currencyLabel(country.currency)}, 국가 설정 열기`} onPress={() => onNavigate('settings')} style={styles.currencyStrip}><Text style={styles.currencyStripFlag}>{country.flag}</Text><View><Text style={styles.currencyStripTitle}>{country.name}</Text><Text style={styles.currencyStripSub}>{currencyLabel(country.currency)} · {country.currency}</Text></View><Text style={styles.chevron}>›</Text></Pressable>
    <View style={styles.inputResultCard}><Text style={styles.cardEyebrow}>현지 금액</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.inputAmount}>{displayAmount || '0'}</Text><Text style={styles.inputCurrency}>{country.currency}</Text><View style={styles.inputDivider} /><Text style={styles.inputKrwLabel}>원화 환산</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.inputKrw}>{amount ? krwAmount : '0원'}</Text></View>
    <NumberPadPremium compact={compact} onPress={onChange} onBackspace={onBackspace} /><Pressable accessibilityRole="button" onPress={onReset} style={styles.resetButton}><Text style={styles.resetButtonText}>전체 지우기</Text></Pressable>
  </ScrollView><BottomNavigationPremium activeTab="input" onTabChange={onNavigate} /></View></SafeAreaView>;
}

function ExchangeRateScreenPremium({ country, exchangeRate, onRefresh, refreshing, onBack, onNavigate }: { country: CountryDisplay; exchangeRate: ExchangeRateSnapshot; onRefresh: () => void; refreshing: boolean; onBack: () => void; onNavigate: (tab: AppTab) => void; activeTab: 'home' | 'scan' | 'input' | 'settings' }) {
  return <SafeAreaView edges={['top']} style={styles.fullScreen}><View style={styles.screenWithNav}><View style={styles.redesignHeader}><Pressable onPress={onBack} style={styles.redesignHeaderButton}><Text style={styles.redesignBack}>‹</Text></Pressable><Text style={styles.redesignHeaderTitle}>환율 정보</Text><View style={styles.redesignHeaderButton} /></View><ScrollView style={styles.redesignScroll} contentContainerStyle={styles.redesignContent} showsVerticalScrollIndicator={false}>
    <View style={styles.rateHero}><Text style={styles.rateHeroFlags}>{country.flag}  →  🇰🇷</Text><Text style={styles.rateHeroLocal}>1,000 {country.currency}</Text><Text style={styles.rateHeroArrow}>↓</Text><Text style={styles.rateHeroKrw}>{Math.round(exchangeRate.rateToKrw * 1000).toLocaleString('ko-KR')} KRW</Text></View>
    <View style={styles.infoCard}><View style={styles.infoRow}><Text style={styles.infoLabel}>마지막 업데이트</Text><Text style={styles.infoValue}>{exchangeRate.updatedAt}</Text></View><View style={styles.infoRow}><Text style={styles.infoLabel}>데이터 상태</Text><Text style={styles.onlineBadge}>● {exchangeRate.source === 'live' ? '최신 환율' : '캐시 사용 중'}</Text></View><View style={styles.infoRow}><Text style={styles.infoLabel}>오프라인</Text><Text style={styles.infoValue}>사용 가능</Text></View></View>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: refreshing, busy: refreshing }} disabled={refreshing} onPress={onRefresh} style={[styles.refreshButton, refreshing && styles.disabledButton]}><Text style={styles.refreshButtonText}>{refreshing ? '업데이트 중...' : '↻  환율 새로고침'}</Text></Pressable><Text style={styles.supportText}>인터넷이 없어도 마지막으로 저장된 환율을 사용할 수 있습니다.</Text>
  </ScrollView><BottomNavigationPremium activeTab="rate" onTabChange={onNavigate} /></View></SafeAreaView>;
}

function HistoryScreenPremium({ recognition, country, exchangeRate, onNavigate }: { recognition: RecognitionState | null; country: CountryDisplay; exchangeRate: ExchangeRateSnapshot; onNavigate: (tab: AppTab) => void }) {
  return <SafeAreaView edges={['top']} style={styles.fullScreen}><View style={styles.screenWithNav}><View style={styles.redesignHeader}><View style={styles.redesignHeaderButton} /><Text style={styles.redesignHeaderTitle}>기록</Text><View style={styles.redesignHeaderButton} /></View><ScrollView contentContainerStyle={styles.redesignContent}><Text style={styles.historySection}>최근 환산</Text>{recognition ? <View style={styles.historyCard}><View style={styles.historyTop}><Text style={styles.historyCountry}>{country.flag} {country.name}</Text><Text style={styles.historyDate}>오늘</Text></View><Text style={styles.historyLocal}>{recognition.amount.toLocaleString('ko-KR')} {recognition.currency}</Text><Text style={styles.historyArrow}>↓</Text><Text style={styles.historyKrw}>{exchangeRateService.formatKrw(recognition.amount * exchangeRate.rateToKrw)}</Text></View> : <View style={styles.emptyCard}><Text style={styles.emptyIcon}>↺</Text><Text style={styles.emptyTitle}>아직 환산 기록이 없습니다</Text><Text style={styles.emptyText}>음성 인식이나 직접 입력으로 환산하면 최근 결과를 여기에서 확인할 수 있습니다.</Text><Pressable onPress={() => onNavigate('voice')} style={styles.emptyAction}><Text style={styles.emptyActionText}>음성으로 시작</Text></Pressable></View>}</ScrollView><BottomNavigationPremium activeTab="history" onTabChange={onNavigate} /></View></SafeAreaView>;
}

function ManualInputScreenLegacy({
  country,
  onCountrySelect,
  amount,
  displayAmount,
  krwAmount,
  onChange,
  onBackspace,
  onReset,
  onBack,
  onNavigate,
  activeTab,
}: {
  country: CountryDisplay;
  onCountrySelect: (code: SupportedCountryCode) => void;
  amount: string;
  displayAmount: string;
  krwAmount: string;
  onChange: (value: string) => void;
  onBackspace: () => void;
  onReset: () => void;
  onBack: () => void;
  onNavigate: (tab: AppTab) => void;
  activeTab: 'home' | 'scan' | 'input' | 'settings';
}) {
  const { height } = useWindowDimensions();
  const compact = height < 900;
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screenWithNav}>
        <ScreenHeader title="직접 입력" showBack onBackPress={onBack} />

        <ScrollView
          contentContainerStyle={[styles.directInputContent, compact && styles.compactDirectInputContent]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.manualContextCard}>
            <View style={styles.manualContextText}>
              <Text style={styles.manualContextLabel}>현재 여행 국가</Text>
              <Text style={styles.manualContextValue}>{country.flag} {country.name}</Text>
              <Text style={styles.manualContextCurrency}>{currencyLabel(country.currency)}</Text>
            </View>
            <CountrySelectorPill
              selectedCode={country.code}
              onSelect={(code) => void onCountrySelect(code as SupportedCountryCode)}
              compact={compact}
            />
          </View>

          <View style={styles.manualAmountSection}>
            <Text style={[styles.heading, compact && styles.compactManualHeading]}>금액 입력</Text>
            <Text style={styles.manualHelp}>숫자 패드로 {currencyLabel(country.currency)} 금액을 입력하세요.</Text>

            <Card variant="outlined" style={[styles.manualAmountCard, compact && styles.compactManualCard]}>
              <View
                accessible
                accessibilityLabel={`금액 입력, ${currencyLabel(country.currency)}, 현재 ${displayAmount || '입력 없음'}`}
                style={[styles.amountInputContainer, compact && styles.compactAmountInputContainer]}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                  numberOfLines={1}
                  style={[styles.amountInput, !displayAmount && styles.amountInputPlaceholder]}>
                  {displayAmount || '0'}
                </Text>
                <Text style={styles.amountCurrency}>{currencyLabel(country.currency)}</Text>
              </View>
            </Card>
          </View>

          <View
            accessible
            accessibilityLabel={amount ? `환산 결과, ${krwAmount}` : '환산 결과, 금액을 입력해 주세요'}
            accessibilityLiveRegion="polite">
            <KRWResultCard
              amount={krwAmount.replace('약 ₩', '').replace(' ', '')}
              compact={compact}
            />
          </View>

          <NumberPadPremium compact={compact} onPress={onChange} onBackspace={onBackspace} />

          <Button
            label="새로 입력"
            onPress={onReset}
            variant="outline"
            style={[styles.fullWidth, compact && styles.compactManualResetButton]}
          />
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} onScanPress={() => onNavigate('scan')} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ExchangeRateScreenLegacy({
  country,
  exchangeRate,
  onRefresh,
  refreshing,
  onBack,
  onNavigate,
  activeTab,
}: {
  country: CountryDisplay;
  exchangeRate: ExchangeRateSnapshot;
  onRefresh: () => void;
  refreshing: boolean;
  onBack: () => void;
  onNavigate: (tab: AppTab) => void;
  activeTab: 'home' | 'scan' | 'input' | 'settings';
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader
          title="환율 정보"
          showBack
          onBackPress={onBack}
        />

        <ScrollView contentContainerStyle={styles.pagePadding}>
          <Card variant="elevated">
            <View style={styles.rateMainContent}>
              <View style={styles.ratePair}>
                <Text style={styles.rateFlag}>{country.flag}</Text>
                <Text style={styles.rateCurrency}>{currencyLabel(country.currency)}</Text>
              </View>
              <Text style={styles.rateArrow}>→</Text>
              <View style={styles.ratePair}>
              <Text style={styles.rateCurrency}>대한민국 원</Text>
                <Text style={styles.rateFlag}>🇰🇷</Text>
              </View>
            </View>

            <View style={styles.spacer} />

            <Text style={styles.rateNumber}>1,000 {currencyLabel(country.currency)}</Text>
            <Text style={styles.rateResult}>≈ {Math.round(exchangeRate.rateToKrw * 1000)}원</Text>

            <View style={styles.spacer} />

            <Text style={styles.rateTime}>{exchangeRate.source === 'fallback' ? '환율 기준' : '환율 기준 시각'}</Text>
            <Text style={styles.rateTimeValue}>{exchangeRate.updatedAt}</Text>

            <View style={styles.spacer} />

            <StatusChip label="최신 환율 저장 완료" type="success" icon="✓" />
          </Card>

          <Text style={styles.infoText}>
            인터넷이 없어도{'\n'}저장된 최근 환율을 사용합니다.
          </Text>

          <Button
            label={refreshing ? '환율 확인 중...' : '지금 업데이트'}
            onPress={onRefresh}
            disabled={refreshing}
            style={styles.fullWidth}
          />
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} onScanPress={() => onNavigate('scan')} />
      </View>
    </SafeAreaView>
  );
}

function ShowAmountScreenPremium({
  country,
  amount,
  onBack,
  onNavigate,
}: {
  country: CountryDisplay;
  amount: number;
  onBack: () => void;
  onNavigate: (tab: AppTab) => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader title="금액" />
        <Pressable onPress={onBack} style={styles.showAmountContainer}>
          <Text style={styles.showAmountText}>
            {new Intl.NumberFormat('ko-KR').format(amount)} {currencyLabel(country.currency)}
          </Text>
        </Pressable>
        <BottomNavigationPremium activeTab="home" onTabChange={onNavigate} onScanPress={() => onNavigate('scan')} />
      </View>
    </SafeAreaView>
  );
}

function SettingsScreenPremium({ settings, onBack, onCountryPress, onRatePress, onAboutPress, onVoiceDiagnostics, onToggle, onNavigate }: { settings: AppSettings; onBack: () => void; onCountryPress: () => void; onRatePress: () => void; onAboutPress: () => void; onVoiceDiagnostics: () => void; onToggle: (key: 'vibrationOn' | 'largeResultText', value: boolean) => void; onNavigate: (tab: AppTab) => void; activeTab: 'home' | 'scan' | 'input' | 'settings' }) {
  const selected = COUNTRY_OPTIONS.find((item) => item.code === settings.selectedCountryCode);
  return <SafeAreaView edges={['top']} style={styles.fullScreen}><View style={styles.screenWithNav}><View style={styles.redesignHeader}><Pressable onPress={onBack} style={styles.redesignHeaderButton}><Text style={styles.redesignBack}>‹</Text></Pressable><Text style={styles.redesignHeaderTitle}>설정</Text><View style={styles.redesignHeaderButton} /></View><ScrollView style={styles.redesignScroll} contentContainerStyle={styles.redesignContent} showsVerticalScrollIndicator={false}>
    <Text style={styles.settingsGroupTitle}>여행 설정</Text><View style={styles.settingsCard}><Pressable onPress={onCountryPress} style={styles.settingsRow}><Text style={styles.settingsRowIcon}>{selected?.flag}</Text><View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>국가 및 통화</Text><Text style={styles.settingsRowSub}>{selected?.name} · {selected ? currencyLabel(selected.currency) : ''}</Text></View><Text style={styles.chevron}>›</Text></Pressable><View style={styles.settingsDivider} /><Pressable onPress={onRatePress} style={styles.settingsRow}><Text style={styles.settingsRowIcon}>⇄</Text><View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>환율 정보</Text><Text style={styles.settingsRowSub}>업데이트 및 오프라인 상태</Text></View><Text style={styles.chevron}>›</Text></Pressable></View>
    <Text style={styles.settingsGroupTitle}>사용 편의</Text><View style={styles.settingsCard}><View style={styles.settingsRow}><Text style={styles.settingsRowIcon}>〰</Text><View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>진동</Text><Text style={styles.settingsRowSub}>인식 완료 시 알림</Text></View><ToggleSwitch accessibilityLabel="진동" value={settings.vibrationOn} onValueChange={(value) => onToggle('vibrationOn', value)} /></View><View style={styles.settingsDivider} /><View style={styles.settingsRow}><Text style={styles.settingsRowIcon}>가</Text><View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>큰 글씨</Text><Text style={styles.settingsRowSub}>환산 결과를 크게 표시</Text></View><ToggleSwitch accessibilityLabel="큰 글씨" value={settings.largeResultText} onValueChange={(value) => onToggle('largeResultText', value)} /></View></View>
    <Text style={styles.settingsGroupTitle}>앱 정보</Text><View style={styles.settingsCard}><Pressable onPress={onVoiceDiagnostics} style={styles.settingsRow}><Text style={styles.settingsRowIcon}>✓</Text><View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>음성 진단</Text><Text style={styles.settingsRowSub}>최근 인식 상태 확인</Text></View><Text style={styles.chevron}>›</Text></Pressable><View style={styles.settingsDivider} /><Pressable onPress={onAboutPress} style={styles.settingsRow}><Text style={styles.settingsRowIcon}>ⓘ</Text><View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>정보 / 버전</Text><Text style={styles.settingsRowSub}>PriceGo v1.0</Text></View><Text style={styles.chevron}>›</Text></Pressable></View>
  </ScrollView><BottomNavigationPremium activeTab="settings" onTabChange={onNavigate} /></View></SafeAreaView>;
}

function SettingsScreenLegacy({
  settings,
  onBack,
  onCountryPress,
  onRatePress,
  onAboutPress,
  onVoiceDiagnostics,
  onToggle,
  onNavigate,
  activeTab,
}: {
  settings: AppSettings;
  onBack: () => void;
  onCountryPress: () => void;
  onRatePress: () => void;
  onAboutPress: () => void;
  onVoiceDiagnostics: () => void;
  onToggle: (key: 'vibrationOn' | 'largeResultText', value: boolean) => void;
  onNavigate: (tab: AppTab) => void;
  activeTab: 'home' | 'scan' | 'input' | 'settings';
}) {
  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.code === settings.selectedCountryCode);

  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader
          title="설정"
          showBack
          onBackPress={onBack}
        />

        <ScrollView contentContainerStyle={styles.settingsContent}>
          <SettingsSection title="일반 설정">
            <SettingRow
              icon={selectedCountry?.flag}
              title="여행 국가"
              value={`${selectedCountry?.name} · ${selectedCountry ? currencyLabel(selectedCountry.currency) : ''}`}
              onPress={onCountryPress}
              showChevron
              accessibilityLabel={`여행 국가, 현재 ${selectedCountry?.name ?? '선택되지 않음'}, 선택 화면 열기`}
            />
            <SettingRow
              title="환율 정보"
              subtitle="최근 환율 보기"
              value="확인"
              onPress={onRatePress}
              showChevron
              accessibilityLabel="환율 정보, 최근 환율 보기, 화면 열기"
            />
          </SettingsSection>

          <SettingsSection title="사용 편의">
            <SettingRow
              title="음성 진단 보기"
              subtitle="최근 음성 인식 단계 확인"
              value="보기"
              onPress={onVoiceDiagnostics}
              showChevron
              accessibilityLabel="음성 진단 보기, 최근 음성 인식 단계 확인, 화면 열기"
            />

            <SettingRow
              title="진동"
              subtitle="인식 완료 시 알림"
              value={
                <ToggleSwitch
                  accessibilityLabel="진동"
                  value={settings.vibrationOn}
                  onValueChange={(v) => onToggle('vibrationOn', v)}
                />
              }
            />

            <SettingRow
              title="결과 글씨 크게"
              subtitle="결과 금액을 더 크게 표시"
              value={
                <ToggleSwitch
                  accessibilityLabel="결과 글씨 크게"
                  value={settings.largeResultText}
                  onValueChange={(v) => onToggle('largeResultText', v)}
                />
              }
            />
          </SettingsSection>

          <SettingsSection title="앱 정보">
            <SettingRow
              title="정보 / 버전"
              value="PriceGo v1.0"
              onPress={onAboutPress}
              showChevron
              accessibilityLabel="정보 및 버전, PriceGo v1.0, 화면 열기"
            />
          </SettingsSection>
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} onScanPress={() => onNavigate('scan')} />
      </View>
    </SafeAreaView>
  );
}

function formatVoiceDiagnostics(logs: VoiceDiagnostic[]) {
  return logs.map((log) => {
    const time = new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour12: false });
    const details = Object.entries(log.details ?? {}).map(([key, value]) => `${key}=${String(value)}`).join(' ');
    return `[${time}] ${log.name}${details ? ` ${details}` : ''}`;
  }).join('\n');
}

function VoiceDiagnosticsModal({
  visible, logs, onClose, onClear, onCopy,
}: { visible: boolean; logs: VoiceDiagnostic[]; onClose: () => void; onClear: () => void; onCopy: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.fullScreen}>
        <ScreenHeader title="음성 진단" showBack onBackPress={onClose} />
        <ScrollView style={styles.voiceDiagnosticList} contentContainerStyle={styles.pagePadding}>
          <Text style={styles.infoText}>최근 음성 인식 로그 {logs.length}/100</Text>
          <Text selectable style={styles.voiceDiagnosticText}>
            {logs.length ? formatVoiceDiagnostics(logs) : '아직 음성 인식 로그가 없습니다.'}
          </Text>
        </ScrollView>
        <View style={styles.voiceDiagnosticActions}>
          <Button label="로그 복사" onPress={onCopy} style={styles.buttonHalf} />
          <Button label="로그 초기화" onPress={onClear} style={styles.buttonHalf} />
          <Button label="닫기" onPress={onClose} style={styles.buttonHalf} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function showRetryAlert(message: string, retry: () => void) {
  Alert.alert('다시 해볼까요?', message, [
    { text: '다시 말하기', onPress: retry },
    { text: '닫기', style: 'cancel' },
  ]);
}

function getSpeechErrorMessage(error: unknown) {
  if (error instanceof SpeechRecognitionError) {
    if (error.code === 'permission-denied' || error.code === 'not-allowed') {
      return '음성을 사용하려면 마이크 권한이 필요합니다.';
    }
    if (error.code === 'no-speech' || error.code === 'speech-timeout' || error.code === 'empty-result') {
      return '잘 듣지 못했어요. 다시 말해주세요.';
    }
  }
  return '잘 듣지 못했어요. 다시 말해주세요.';
}

function currencyLabel(currency: CurrencyCode) {
  return ({ VND: '베트남 동', JPY: '일본 엔', CNY: '중국 위안', USD: '미국 달러', KRW: '대한민국 원' } as Record<CurrencyCode, string>)[currency];
}

const styles = StyleSheet.create({
  redesignHeader:{height:SIZES.headerHeight,paddingHorizontal:SPACING.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.surface,borderBottomWidth:1,borderBottomColor:COLORS.borderLight},redesignHeaderButton:{width:48,height:48,alignItems:'center',justifyContent:'center'},redesignBack:{fontSize:34,color:COLORS.textPrimary},redesignHeaderTitle:{...TYPOGRAPHY.title,color:COLORS.textPrimary},redesignScroll:{flex:1},redesignContent:{width:'100%',maxWidth:PRICE_GO_THEME.size.contentMaxWidth,alignSelf:'center',padding:SIZES.screenPadding,paddingBottom:SPACING.xxl},
  currencyStrip:{minHeight:68,padding:SPACING.lg,borderRadius:SIZES.cardRadius,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.borderLight,flexDirection:'row',alignItems:'center',gap:SPACING.md,...SHADOWS.sm},currencyStripFlag:{fontSize:30},currencyStripTitle:{...TYPOGRAPHY.body,color:COLORS.textPrimary,fontWeight:'700'},currencyStripSub:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary,marginTop:2},inputResultCard:{marginTop:SPACING.md,padding:SPACING.lg,borderRadius:SIZES.cardRadius,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.borderLight,alignItems:'center',...SHADOWS.sm},inputAmount:{...TYPOGRAPHY.amountKRW,fontSize:44,color:COLORS.textPrimary,width:'100%',textAlign:'center'},inputCurrency:{...TYPOGRAPHY.bodyMedium,color:COLORS.textSecondary},inputDivider:{width:'100%',height:1,backgroundColor:COLORS.border,marginVertical:SPACING.md},inputKrwLabel:{...TYPOGRAPHY.captionSmall,color:COLORS.textSecondary},inputKrw:{...TYPOGRAPHY.heading,fontSize:30,lineHeight:38,color:COLORS.primary,marginTop:4,width:'100%',textAlign:'center'},resetButton:{height:48,alignItems:'center',justifyContent:'center'},resetButtonText:{...TYPOGRAPHY.bodyMedium,color:COLORS.textSecondary,fontWeight:'700'},
  rateHero:{padding:SPACING.xxl,borderRadius:SIZES.cardRadius,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.borderLight,alignItems:'center',...SHADOWS.sm},rateHeroFlags:{fontSize:30,marginBottom:SPACING.lg},rateHeroLocal:{...TYPOGRAPHY.heading,color:COLORS.textPrimary},rateHeroArrow:{fontSize:28,color:COLORS.textTertiary,marginVertical:SPACING.sm},rateHeroKrw:{...TYPOGRAPHY.amountLocal,color:COLORS.primary},infoCard:{marginTop:SPACING.lg,paddingHorizontal:SPACING.xl,borderRadius:SIZES.cardRadius,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.borderLight,...SHADOWS.sm},infoRow:{minHeight:62,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:SPACING.md,borderBottomWidth:1,borderBottomColor:COLORS.borderLight},infoLabel:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary},infoValue:{...TYPOGRAPHY.bodySmall,color:COLORS.textPrimary,fontWeight:'700',textAlign:'right',flexShrink:1},onlineBadge:{...TYPOGRAPHY.bodySmall,color:COLORS.success,fontWeight:'700'},refreshButton:{minHeight:SIZES.buttonHeight,borderRadius:RADIUS.md,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',marginTop:SPACING.xl,...SHADOWS.sm},refreshButtonText:{...TYPOGRAPHY.body,color:COLORS.surface,fontWeight:'700'},disabledButton:{backgroundColor:COLORS.disabled,opacity:.7},supportText:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary,textAlign:'center',marginTop:SPACING.md,paddingHorizontal:SPACING.md},
  historySection:{...TYPOGRAPHY.subheading,color:COLORS.textPrimary,marginBottom:SPACING.md},historyCard:{padding:SPACING.xl,borderRadius:SIZES.cardRadius,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.borderLight,...SHADOWS.sm},historyTop:{flexDirection:'row',justifyContent:'space-between'},historyCountry:{...TYPOGRAPHY.bodyMedium,color:COLORS.textPrimary,fontWeight:'700'},historyDate:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary},historyLocal:{...TYPOGRAPHY.heading,color:COLORS.textPrimary,marginTop:SPACING.lg},historyArrow:{fontSize:22,color:COLORS.textTertiary,marginVertical:SPACING.xs},historyKrw:{...TYPOGRAPHY.heading,color:COLORS.primary},emptyCard:{padding:SPACING.xxl,borderRadius:SIZES.cardRadius,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.borderLight,alignItems:'center',...SHADOWS.sm},emptyIcon:{fontSize:40,color:COLORS.primary},emptyTitle:{...TYPOGRAPHY.subheading,color:COLORS.textPrimary,marginTop:SPACING.md},emptyText:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary,textAlign:'center',marginTop:SPACING.sm,lineHeight:21},emptyAction:{minHeight:SIZES.buttonHeight,borderRadius:RADIUS.md,backgroundColor:COLORS.primary,paddingHorizontal:SPACING.xxl,alignItems:'center',justifyContent:'center',marginTop:SPACING.xl},emptyActionText:{...TYPOGRAPHY.bodyMedium,color:COLORS.surface,fontWeight:'700'},
  settingsGroupTitle:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary,fontWeight:'700',marginTop:SPACING.sm,marginBottom:SPACING.sm,marginLeft:SPACING.xs},settingsCard:{borderRadius:SIZES.cardRadius,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.borderLight,paddingHorizontal:SPACING.lg,marginBottom:SPACING.md,...SHADOWS.sm},settingsRow:{height:76,flexDirection:'row',alignItems:'center',gap:SPACING.md},settingsRowIcon:{width:32,fontSize:24,textAlign:'center',color:COLORS.primary},settingsRowBody:{flex:1,justifyContent:'center'},settingsRowTitle:{...TYPOGRAPHY.bodyMedium,color:COLORS.textPrimary,fontWeight:'700'},settingsRowSub:{...TYPOGRAPHY.bodySmall,color:COLORS.textSecondary,marginTop:SPACING.xs},settingsDivider:{height:1,backgroundColor:COLORS.borderLight,marginLeft:44},
  successPill:{alignSelf:'center',paddingHorizontal:SPACING.md,paddingVertical:SPACING.sm,borderRadius:RADIUS.full,backgroundColor:COLORS.successLight},successPillText:{...TYPOGRAPHY.bodySmall,color:COLORS.success,fontWeight:'700'},resultHero:{alignItems:'center',padding:SPACING.xxl,borderRadius:SIZES.cardRadius,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.borderLight,marginTop:SPACING.md,...SHADOWS.sm},resultCountry:{...TYPOGRAPHY.bodyMedium,color:COLORS.textSecondary},resultLocal:{...TYPOGRAPHY.amountLocal,color:COLORS.textPrimary,width:'100%',textAlign:'center',marginTop:SPACING.md},resultDown:{fontSize:30,color:COLORS.textTertiary,marginVertical:SPACING.sm},resultKrwPremium:{...TYPOGRAPHY.heading,fontSize:34,lineHeight:42,color:COLORS.primary,width:'100%',textAlign:'center'},resultKrwLarge:{fontSize:42,lineHeight:50},secondaryActions:{flexDirection:'row',gap:SPACING.md,marginTop:SPACING.md},secondaryPremiumButton:{flex:1,minHeight:SIZES.buttonHeight,borderRadius:RADIUS.md,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'},secondaryPremiumText:{...TYPOGRAPHY.bodyMedium,color:COLORS.primary,fontWeight:'700'},
  homeHeader: { height: SIZES.headerHeight, paddingHorizontal: SIZES.screenPadding, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  homeTitle: { ...TYPOGRAPHY.title, color: COLORS.textPrimary },
  homeSettingsButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  homeSettingsIcon: { fontSize: 24, color: COLORS.textPrimary },
  newHomeContent: { width: '100%', maxWidth: PRICE_GO_THEME.size.contentMaxWidth, alignSelf: 'center', paddingHorizontal: SIZES.screenPadding, paddingTop: SPACING.md, paddingBottom: SPACING.xl },
  newHomeContentCompact: { paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  countrySummary: { minHeight: 68, padding: SPACING.lg, borderRadius: SIZES.cardRadius, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, ...SHADOWS.sm },
  countrySummaryFlag: { fontSize: 30 },
  countrySummaryName: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, fontWeight: '700' as const },
  countrySummaryHint: { ...TYPOGRAPHY.captionSmall, color: COLORS.textSecondary, marginTop: 2 },
  chevron: { marginLeft: 'auto', fontSize: 28, color: COLORS.textTertiary },
  rateSummaryCard: { marginTop: SPACING.md, padding: SPACING.xl, borderRadius: SIZES.cardRadius, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm },
  cardEyebrow: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 10 },
  rateSummaryRow: { alignItems: 'flex-start' },
  rateLocal: { ...TYPOGRAPHY.subheading, color: COLORS.textPrimary }, rateEquals: { fontSize: 22, lineHeight: 26, color: COLORS.textTertiary, marginVertical: 2 }, rateKrw: { ...TYPOGRAPHY.heading, color: COLORS.primary },
  rateMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 6 }, offlineDot: { fontSize: 12, color: COLORS.success }, rateMetaText: { ...TYPOGRAPHY.captionSmall, color: COLORS.textSecondary }, rateDate: { ...TYPOGRAPHY.captionSmall, color: COLORS.textTertiary, marginLeft: 'auto' },
  voiceSection: { alignItems: 'center', paddingVertical: SPACING.lg }, voiceSectionCompact: { paddingVertical: SPACING.sm }, voiceTitle: { ...TYPOGRAPHY.subheading, color: COLORS.textPrimary, marginTop: SPACING.sm }, voiceExamples: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: SPACING.xs },
  sectionLabel: { ...TYPOGRAPHY.subheading, color: COLORS.textPrimary, marginBottom: SPACING.sm }, quickGrid: { flexDirection: 'row', gap: SPACING.sm }, quickCard: { flex: 1, minWidth: 0, minHeight: 78, paddingHorizontal: SPACING.xs, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm }, quickIcon: { fontSize: 24, marginBottom: SPACING.xs }, quickLabel: { ...TYPOGRAPHY.captionSmall, color: COLORS.textPrimary, fontWeight: '700' as const, textAlign: 'center' },
  scanHint: { alignItems: 'center', paddingVertical: SPACING.md }, scanHintText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.primary, fontWeight: '700' as const }, bottomInfo: { ...TYPOGRAPHY.captionSmall, color: COLORS.textSecondary, textAlign: 'center' },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenWithNav: {
    flex: 1,
    justifyContent: 'space-between',
  },
  pagePadding: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  directInputContent: {
    width: '100%',
    maxWidth: PRICE_GO_THEME.size.contentMaxWidth,
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: PRICE_GO_THEME.spacing.lg,
    paddingTop: PRICE_GO_THEME.spacing.md,
    paddingBottom: PRICE_GO_THEME.spacing.xl,
  },
  compactDirectInputContent: {
    paddingTop: PRICE_GO_THEME.spacing.sm,
    paddingBottom: PRICE_GO_THEME.spacing.md,
  },
  homePagePadding: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    flexGrow: 1,
  },
  compactHomePagePadding: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  resultPagePadding: {
    width: '100%',
    maxWidth: PRICE_GO_THEME.size.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    flexGrow: 1,
  },
  compactPagePadding: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxxl,
  },
  onboardingContent: {
    alignItems: 'center',
    gap: SPACING.xl,
  },
  priceGoLogo: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  heroSection: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroMain: {
    ...TYPOGRAPHY.heading,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  heroAccent: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
  },
  micIconSection: {
    paddingVertical: SPACING.xl,
  },
  micIconLarge: {
    fontSize: 64,
    textAlign: 'center',
  },
  helperText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginVertical: SPACING.xl,
  },
  countryCard: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  countryCardActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  countryFlag: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  countryName: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '600' as const,
  },
  countryCurrency: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  checkmark: {
    fontSize: 18,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  spacer: {
    height: SPACING.xl,
  },
  compactSpacer: {
    height: SPACING.md,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  homeCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginVertical: SPACING.lg,
  },
  heading: {
    ...TYPOGRAPHY.heading,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  micPromptTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.textPrimary,
    fontWeight: '600' as const,
    marginTop: SPACING.lg,
  },
  compactMicPromptTitle: {
    marginTop: SPACING.md,
  },
  micPromptDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  compactMicPromptDesc: {
    marginTop: SPACING.xs,
  },
  homeManualButton: {
    display: 'none',
    alignSelf: 'center',
    minWidth: 160,
    marginTop: SPACING.sm,
  },
  listeningTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.textPrimary,
  },
  listeningDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  voiceStateContent: {
    width: '100%',
    maxWidth: PRICE_GO_THEME.size.contentMaxWidth,
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: PRICE_GO_THEME.spacing.lg,
    paddingVertical: PRICE_GO_THEME.spacing.md,
  },
  voiceStatusPanel: {
    width: '100%',
    alignItems: 'center',
    gap: PRICE_GO_THEME.spacing.sm,
    padding: PRICE_GO_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: PRICE_GO_THEME.color.borderDefault,
    borderRadius: PRICE_GO_THEME.radius.md,
    backgroundColor: PRICE_GO_THEME.color.backgroundSurface,
  },
  listeningContext: {
    ...PRICE_GO_THEME.typography.bodySmall,
    color: PRICE_GO_THEME.color.textMuted,
    textAlign: 'center',
  },
  arrowDown: {
    fontSize: 28,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.md,
  },
  detailsCard: {
    marginTop: SPACING.xl,
  },
  resultArrowDown: {
    fontSize: 24,
    lineHeight: 28,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.xs,
  },
  resultDetailsCard: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  recognitionFeedbackCard: {
    gap: PRICE_GO_THEME.spacing.sm,
    marginBottom: PRICE_GO_THEME.spacing.md,
  },
  recognizedSpeech: {
    ...PRICE_GO_THEME.typography.body,
    color: PRICE_GO_THEME.color.textPrimary,
  },
  recognitionSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PRICE_GO_THEME.spacing.md,
    paddingTop: PRICE_GO_THEME.spacing.sm,
  },
  reviewHelp: {
    ...PRICE_GO_THEME.typography.bodySmall,
    color: PRICE_GO_THEME.color.textSecondary,
  },
  detailRow: {
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  resultButtonRow: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  resultSecondaryButton: { width: '100%' },
  resultMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  resultMetaColumn: {
    flex: 1,
    flexBasis: 180,
    minWidth: 0,
  },
  compactManualHeading: {
    marginBottom: SPACING.xs,
    fontSize: 18,
    lineHeight: 24,
  },
  compactManualCard: {
    paddingVertical: 6,
  },
  homeExchangeRateCard: {
    marginTop: 32,
  },
  ocrResultCard: {
    marginTop: SPACING.md,
  },
  ocrResultLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  ocrResultAmount: {
    ...TYPOGRAPHY.amountLocal,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  ocrResultKrw: {
    ...TYPOGRAPHY.amountKRW,
    color: COLORS.primary,
    textAlign: 'center',
  },
  compactManualResetButton: {
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonMedium: {
    alignSelf: 'center',
    width: '60%',
    marginTop: SPACING.lg,
  },
  fullWidth: {
    width: '100%',
    marginVertical: SPACING.md,
  },
  manualContextCard: {
    gap: PRICE_GO_THEME.spacing.md,
    padding: PRICE_GO_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: PRICE_GO_THEME.color.borderDefault,
    borderRadius: PRICE_GO_THEME.radius.md,
    backgroundColor: PRICE_GO_THEME.color.backgroundSurface,
    ...PRICE_GO_THEME.shadow.surface,
  },
  manualContextText: { gap: PRICE_GO_THEME.spacing.xs },
  manualContextLabel: {
    ...PRICE_GO_THEME.typography.captionSmall,
    color: PRICE_GO_THEME.color.textSecondary,
  },
  manualContextValue: {
    ...PRICE_GO_THEME.typography.body,
    color: PRICE_GO_THEME.color.textPrimary,
  },
  manualContextCurrency: {
    ...PRICE_GO_THEME.typography.bodySmall,
    color: PRICE_GO_THEME.color.textSecondary,
  },
  manualAmountSection: { marginTop: PRICE_GO_THEME.spacing.lg },
  manualHelp: {
    ...PRICE_GO_THEME.typography.bodySmall,
    marginBottom: PRICE_GO_THEME.spacing.md,
    color: PRICE_GO_THEME.color.textSecondary,
  },
  manualAmountCard: {
    minHeight: 96,
    justifyContent: 'center',
  },
  amountInputContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  compactAmountInputContainer: {
    gap: SPACING.xs,
  },
  amountInput: {
    ...TYPOGRAPHY.amountLocal,
    width: '100%',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  amountInputPlaceholder: { color: PRICE_GO_THEME.color.textMuted },
  amountCurrency: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  rateMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  ratePair: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rateFlag: {
    fontSize: 24,
  },
  rateCurrency: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600' as const,
  },
  rateArrow: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  rateNumber: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  rateResult: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
    textAlign: 'center',
  },
  rateTime: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
  },
  rateTimeValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.lg,
  },
  showAmountContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  showAmountText: {
    ...TYPOGRAPHY.amountKRW,
    color: COLORS.textPrimary,
  },
  showAmountBackButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  settingsContent: {
    width: '100%',
    maxWidth: PRICE_GO_THEME.size.contentMaxWidth,
    alignSelf: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  voiceDiagnosticList: { flex: 1 },
  voiceDiagnosticText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
  },
  voiceDiagnosticActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.md,
  },
});
