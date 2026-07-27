import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AudioWave } from '@/components/AudioWave';
import { BottomNavigation } from '@/components/BottomNavigation';
import { CountrySelector } from '@/components/CountrySelector';
import { CurrencyAmount } from '@/components/CurrencyAmount';
import { ExchangeRateInfo } from '@/components/ExchangeRateInfo';
import { KRWResult } from '@/components/KRWResult';
import { MicButton } from '@/components/MicButton';
import { NumberPad } from '@/components/NumberPad';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ResultCard } from '@/components/ResultCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COUNTRY_BY_CODE, ExchangeRateService } from '@/services/exchange-rate.service';
import { PriceParserService } from '@/services/price-parser.service';
import { SpeechRecognitionService } from '@/services/speech-recognition.service';
import { LocalStorageService } from '@/services/storage';
import type { AppSettings, CurrencyCode, SupportedCountryCode } from '@/services/types';

const storage = new LocalStorageService();
const exchangeRateService = new ExchangeRateService();
const speechService = new SpeechRecognitionService();
const parserService = new PriceParserService();

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
  | 'settings';

const defaultSettings: AppSettings = {
  selectedCountryCode: 'VN',
  selectedCurrency: 'VND',
  offlineFirst: true,
  autoUpdate: true,
  vibrationOn: true,
  largeResultText: true,
};

export function PriceGoApp() {
  const [screen, setScreen] = useState<ScreenName>('onboarding');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [recognition, setRecognition] = useState<{ amount: number; text: string; currency: CurrencyCode } | null>(null);
  const [manualInput, setManualInput] = useState('300000');
  const [displayAmount, setDisplayAmount] = useState('300,000');
  const [activeTab, setActiveTab] = useState<'home' | 'input' | 'settings'>('home');

  useEffect(() => {
    const loadSettings = async () => {
      const stored = await storage.getItem('pricego-settings');
      if (!stored) {
        await storage.setItem('pricego-settings', JSON.stringify(defaultSettings));
        setSettings(defaultSettings);
        setScreen('onboarding');
        return;
      }

      const parsed = JSON.parse(stored) as AppSettings;
      setSettings(parsed);
      setScreen(parsed.selectedCountryCode ? 'home' : 'onboarding');
    };

    loadSettings();
  }, []);

  const country = COUNTRY_BY_CODE[settings.selectedCountryCode] ?? COUNTRY_BY_CODE.VN;
  const exchangeRate = exchangeRateService.getRate(country.currency);
  const krwValue = useMemo(() => exchangeRateService.calculateKrw(Number(manualInput) || 0, country.currency), [country.currency, manualInput]);

  const saveSettings = async (next: AppSettings) => {
    setSettings(next);
    await storage.setItem('pricego-settings', JSON.stringify(next));
  };

  const startListening = async () => {
    setScreen('listening');
    const result = await speechService.recognizeMock(settings.selectedCountryCode);
    const parsed = parserService.parse(result.recognizedText, result.currency);
    const amount = parsed?.amount ?? result.parsedAmount;
    setRecognition({ amount, text: result.recognizedText, currency: result.currency });
    setTimeout(() => {
      if (result.needsConfirmation) {
        setScreen('recognition-check');
      } else {
        setScreen('result');
      }
    }, 1200);
  };

  const confirmAmount = (candidate: number) => {
    setRecognition((prev) => prev ? { ...prev, amount: candidate } : prev);
    setScreen('result');
  };

  const handleCountrySelect = async (code: SupportedCountryCode) => {
    const nextSettings = {
      ...settings,
      selectedCountryCode: code,
      selectedCurrency: COUNTRY_BY_CODE[code].currency,
    };
    await saveSettings(nextSettings);
    setScreen('home');
  };

  const handleManualInputChange = (value: string) => {
    const next = `${manualInput}${value}`.replace(/^0+(?=\d)/, '');
    setManualInput(next || '0');
    setDisplayAmount(new Intl.NumberFormat('ko-KR').format(Number(next || '0')));
  };

  const handleManualBackspace = () => {
    const next = manualInput.slice(0, -1);
    setManualInput(next || '0');
    setDisplayAmount(new Intl.NumberFormat('ko-KR').format(Number(next || '0')));
  };

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <OnboardingScreen onStart={() => setScreen('country-select')} />;
      case 'country-select':
        return (
          <CountrySelectScreen
            selectedCode={settings.selectedCountryCode}
            onSelect={handleCountrySelect}
            onContinue={() => setScreen('home')}
          />
        );
      case 'home':
        return (
          <HomeScreen
            country={country}
            exchangeRate={exchangeRate}
            onMicPress={startListening}
            onNavigate={(tab) => {
              setActiveTab(tab);
              if (tab === 'input') {
                setScreen('manual-input');
              } else if (tab === 'settings') {
                setScreen('settings');
              } else {
                setScreen('home');
              }
            }}
          />
        );
      case 'listening':
        return <ListeningScreen onStop={() => setScreen('home')} />;
      case 'result':
        return (
          <ResultScreen
            recognition={recognition}
            country={country}
            exchangeRate={exchangeRate}
            onReplay={() => startListening()}
            onShowAmount={() => setScreen('show-amount')}
            onManual={() => setScreen('manual-input')}
          />
        );
      case 'recognition-check':
        return (
          <RecognitionCheckScreen
            country={country}
            recognition={recognition}
            onConfirm={confirmAmount}
            onReplay={() => startListening()}
            onManual={() => setScreen('manual-input')}
          />
        );
      case 'manual-input':
        return (
          <ManualInputScreen
            country={country}
            amount={manualInput}
            displayAmount={displayAmount}
            krwAmount={exchangeRateService.formatKrw(krwValue)}
            onChange={handleManualInputChange}
            onBackspace={handleManualBackspace}
            onDone={() => setScreen('home')}
          />
        );
      case 'exchange-rate':
        return <ExchangeRateScreen country={country} exchangeRate={exchangeRate} onBack={() => setScreen('settings')} />;
      case 'show-amount':
        return <ShowAmountScreen country={country} amount={recognition?.amount ?? 300000} onBack={() => setScreen('result')} />;
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onBack={() => setScreen('home')}
            onCountryPress={() => setScreen('country-select')}
            onRatePress={() => setScreen('exchange-rate')}
            onToggle={(key, value) => {
              const next = { ...settings, [key]: value } as AppSettings;
              saveSettings(next);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>{renderScreen()}</SafeAreaView>
    </ThemedView>
  );
}

function OnboardingScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.centeredContent}>
      <View style={styles.brandBlock}>
        <ThemedText style={styles.logo}>PriceGo</ThemedText>
        <ThemedText style={styles.heroText}>{'들리는 가격을\n바로 원화로'}</ThemedText>
        <Pressable onPress={onStart} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>시작하기</ThemedText>
        </Pressable>
        <ThemedText themeColor="textSecondary" style={styles.helperText}>
          {'일본어 · 중국어 · 영어 · 베트남어\n가격 음성을 인식합니다.'}
        </ThemedText>
      </View>
    </ScrollView>
  );
}

function CountrySelectScreen({
  selectedCode,
  onSelect,
  onContinue,
}: {
  selectedCode: SupportedCountryCode;
  onSelect: (code: SupportedCountryCode) => void;
  onContinue: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.pagePadding}>
      <AppHeader title="어디를 여행 중인가요?" />
      <CountrySelector selectedCode={selectedCode} onSelect={(code) => onSelect(code as SupportedCountryCode)} />
      <Pressable onPress={onContinue} style={styles.primaryButton}>
        <ThemedText style={styles.primaryButtonText}>홈으로 이동</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function HomeScreen({
  country,
  exchangeRate,
  onMicPress,
  onNavigate,
}: {
  country: { name: string; flag: string; currency: CurrencyCode };
  exchangeRate: { rateToKrw: number; updatedAt: string };
  onMicPress: () => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
}) {
  return (
    <View style={styles.pageColumn}>
      <AppHeader title="PriceGo" subtitle={`${country.flag} ${country.name} · ${country.currency}`} />
      <OfflineBanner />
      <View style={styles.centerSection}>
        <MicButton onPress={onMicPress} size={170} />
        <ThemedText style={styles.promptTitle}>가격을 들어볼게요</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.promptSubtitle}>
          버튼을 누르고 들려주세요
        </ThemedText>
      </View>
      <ExchangeRateInfo
        rateText={`1,000 ${country.currency} ≈ ${Math.round(exchangeRate.rateToKrw * 1000)} KRW`}
        updatedAt={exchangeRate.updatedAt}
        statusText="오프라인 사용 가능"
      />
      <BottomNavigation activeTab="home" onTabChange={onNavigate} />
    </View>
  );
}

function ListeningScreen({ onStop }: { onStop: () => void }) {
  return (
    <View style={styles.pageColumn}>
      <AppHeader title="듣고 있어요..." subtitle="가격을 말씀해 주세요" />
      <View style={styles.centerSection}>
        <MicButton listening onPress={onStop} size={170} />
        <AudioWave active />
        <Pressable onPress={onStop} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>중지</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function ResultScreen({
  recognition,
  country,
  exchangeRate,
  onReplay,
  onShowAmount,
  onManual,
}: {
  recognition: { amount: number; text: string; currency: CurrencyCode } | null;
  country: { flag: string; currency: CurrencyCode };
  exchangeRate: { rateToKrw: number; updatedAt: string };
  onReplay: () => void;
  onShowAmount: () => void;
  onManual: () => void;
}) {
  const localAmount = recognition?.amount ?? 300000;
  const krwAmount = exchangeRateService.formatKrw(localAmount * exchangeRate.rateToKrw);
  return (
    <ScrollView contentContainerStyle={styles.pagePadding}>
      <ResultCard
        localAmount={new Intl.NumberFormat('ko-KR').format(localAmount)}
        localCurrency={country.currency}
        krwAmount={krwAmount}
        recognizedText={recognition?.text ?? 'ba trăm nghìn đồng'}
        rateText={`1,000 ${country.currency} ≈ ${Math.round(exchangeRate.rateToKrw * 1000)} KRW`}
        updatedAt={exchangeRate.updatedAt}
      />
      <View style={styles.buttonRow}>
        <Pressable onPress={onReplay} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>다시 듣기</ThemedText>
        </Pressable>
        <Pressable onPress={onManual} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>직접 수정</ThemedText>
        </Pressable>
      </View>
      <Pressable onPress={onShowAmount} style={styles.primaryButton}>
        <ThemedText style={styles.primaryButtonText}>상대방에게 보여주기</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function RecognitionCheckScreen({
  country,
  recognition,
  onConfirm,
  onReplay,
  onManual,
}: {
  country: { currency: CurrencyCode };
  recognition: { amount: number; text: string; currency: CurrencyCode } | null;
  onConfirm: (candidate: number) => void;
  onReplay: () => void;
  onManual: () => void;
}) {
  const amount = recognition?.amount ?? 300000;
  const candidates = [amount, amount / 10, amount * 10];
  return (
    <ScrollView contentContainerStyle={styles.pagePadding}>
      <ThemedText style={styles.sectionTitle}>금액을 다시 확인해 주세요</ThemedText>
      <CurrencyAmount amount={new Intl.NumberFormat('ko-KR').format(amount)} currency={country.currency} />
      <ThemedText themeColor="textSecondary" style={styles.helperText}>혹시 아래 금액인가요?</ThemedText>
      {candidates.map((candidate) => (
        <Pressable key={candidate} onPress={() => onConfirm(candidate)} style={styles.optionButton}>
          <ThemedText style={styles.optionText}>{new Intl.NumberFormat('ko-KR').format(candidate)} {country.currency}</ThemedText>
        </Pressable>
      ))}
      <Pressable onPress={onReplay} style={styles.secondaryButton}>
        <ThemedText style={styles.secondaryButtonText}>다시 듣기</ThemedText>
      </Pressable>
      <Pressable onPress={onManual} style={styles.secondaryButton}>
        <ThemedText style={styles.secondaryButtonText}>직접 입력하기</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function ManualInputScreen({
  country,
  amount,
  displayAmount,
  krwAmount,
  onChange,
  onBackspace,
  onDone,
}: {
  country: { flag: string; name: string; currency: CurrencyCode };
  amount: string;
  displayAmount: string;
  krwAmount: string;
  onChange: (value: string) => void;
  onBackspace: () => void;
  onDone: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.pagePadding}>
      <AppHeader title={`${country.flag} ${country.name} · ${country.currency}`} />
      <ThemedText style={styles.inputAmount}>{displayAmount} {country.currency}</ThemedText>
      <KRWResult value={krwAmount} large />
      <NumberPad onPress={onChange} onBackspace={onBackspace} />
      <Pressable onPress={onDone} style={styles.primaryButton}>
        <ThemedText style={styles.primaryButtonText}>완료</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function ExchangeRateScreen({
  country,
  exchangeRate,
  onBack,
}: {
  country: { name: string; currency: CurrencyCode };
  exchangeRate: { rateToKrw: number; updatedAt: string };
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.pagePadding}>
      <AppHeader title={`${country.name} 환율`} actionLabel="뒤로" onActionPress={onBack} />
      <ExchangeRateInfo
        rateText={`${country.currency} → KRW`}
        updatedAt={exchangeRate.updatedAt}
        statusText="인터넷이 없어도 저장된 환율을 사용합니다."
      />
      <ThemedText style={styles.sectionTitle}>1,000 {country.currency} ≈ {Math.round(exchangeRate.rateToKrw * 1000)} KRW</ThemedText>
    </ScrollView>
  );
}

function ShowAmountScreen({
  country,
  amount,
  onBack,
}: {
  country: { currency: CurrencyCode };
  amount: number;
  onBack: () => void;
}) {
  return (
    <View style={styles.showAmountScreen}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <ThemedText>←</ThemedText>
      </Pressable>
      <ThemedText style={styles.showAmountText}>{new Intl.NumberFormat('ko-KR').format(amount)} {country.currency}</ThemedText>
    </View>
  );
}

function SettingsScreen({
  settings,
  onBack,
  onCountryPress,
  onRatePress,
  onToggle,
}: {
  settings: AppSettings;
  onBack: () => void;
  onCountryPress: () => void;
  onRatePress: () => void;
  onToggle: (key: 'offlineFirst' | 'autoUpdate' | 'vibrationOn' | 'largeResultText', value: boolean) => void;
}) {
  const rows = [
    { label: '여행 국가', value: settings.selectedCurrency, onPress: onCountryPress },
    { label: '기준 통화', value: '대한민국 원 KRW', onPress: () => {} },
    { label: '음성인식', value: settings.offlineFirst ? '오프라인 우선 ON' : 'OFF', onPress: () => onToggle('offlineFirst', !settings.offlineFirst) },
    { label: '환율', value: settings.autoUpdate ? '자동 업데이트 ON' : 'OFF', onPress: () => onToggle('autoUpdate', !settings.autoUpdate) },
    { label: '진동', value: settings.vibrationOn ? 'ON' : 'OFF', onPress: () => onToggle('vibrationOn', !settings.vibrationOn) },
    { label: '결과 글씨 크게', value: settings.largeResultText ? 'ON' : 'OFF', onPress: () => onToggle('largeResultText', !settings.largeResultText) },
  ];

  return (
    <ScrollView contentContainerStyle={styles.pagePadding}>
      <AppHeader title="설정" actionLabel="뒤로" onActionPress={onBack} />
      {rows.map((row) => (
        <Pressable key={row.label} onPress={row.onPress} style={styles.settingRow}>
          <ThemedText>{row.label}</ThemedText>
          <ThemedText themeColor="textSecondary">{row.value}</ThemedText>
        </Pressable>
      ))}
      <Pressable onPress={onRatePress} style={styles.primaryButton}>
        <ThemedText style={styles.primaryButtonText}>환율 상태 보기</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    flex: 1,
  },
  centeredContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  brandBlock: {
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  logo: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0f172a',
  },
  heroText: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
  },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    minWidth: 180,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  pagePadding: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  pageColumn: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptTitle: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: '700',
  },
  promptSubtitle: {
    marginTop: 6,
    textAlign: 'center',
  },
  helperText: {
    marginTop: 10,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginTop: 10,
  },
  optionText: {
    fontWeight: '700',
    fontSize: 16,
  },
  inputAmount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  showAmountScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 24,
  },
  showAmountText: {
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
  },
});
