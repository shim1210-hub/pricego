import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, Vibration, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { AudioWavePremium } from '@/components/AudioWavePremium';
import { BottomNavigationPremium } from '@/components/BottomNavigationPremium';
import { CountrySelectorPill } from '@/components/CountrySelectorPill';
import { ExchangeRateCard } from '@/components/ExchangeRateCard';
import { KRWResultCard } from '@/components/KRWResultCard';
import { LocalCurrencyCard } from '@/components/LocalCurrencyCard';
import { MicButtonPremium } from '@/components/MicButtonPremium';
import { NumberPadPremium } from '@/components/NumberPadPremium';
import { OfflineBannerPremium } from '@/components/OfflineBannerPremium';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { StatusChip } from '@/components/ui/StatusChip';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { AppSettingsService, DEFAULT_APP_SETTINGS } from '@/services/app-settings.service';
import { COUNTRY_BY_CODE, COUNTRY_OPTIONS, ExchangeRateService } from '@/services/exchange-rate.service';
import { PriceParserService } from '@/services/price-parser.service';
import { SpeechRecognitionError, SpeechRecognitionService } from '@/services/speech-recognition.service';
import type { AppSettings, CurrencyCode, ExchangeRateSnapshot, SupportedCountryCode } from '@/services/types';

const settingsService = new AppSettingsService();
const exchangeRateService = new ExchangeRateService();
const speechService = new SpeechRecognitionService();
const parserService = new PriceParserService();

type CountryDisplay = { code: SupportedCountryCode; name: string; flag: string; currency: CurrencyCode };
type RecognitionState = { amount: number; text: string; currency: CurrencyCode };

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

export function PriceGoApp() {
  const [screen, setScreen] = useState<ScreenName>('onboarding');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [recognition, setRecognition] = useState<RecognitionState | null>(null);
  const [manualInput, setManualInput] = useState('300000');
  const [displayAmount, setDisplayAmount] = useState('300,000');
  const [activeTab, setActiveTab] = useState<'home' | 'input' | 'settings'>('home');
  const [rateVersion, setRateVersion] = useState(0);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const isMountedRef = useRef(true);
  const listeningRef = useRef(false);

  useEffect(() => () => {
    isMountedRef.current = false;
    if (listeningRef.current) speechService.cancel();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const parsed = await settingsService.load();
      await exchangeRateService.initialize();
      if (!isMountedRef.current) return;
      setSettings(parsed);
      setScreen(parsed.selectedCountryCode ? 'home' : 'onboarding');
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (screen === 'manual-input') {
      setActiveTab('input');
    } else if (screen === 'settings' || screen === 'exchange-rate') {
      setActiveTab('settings');
    } else if (screen === 'home' || screen === 'listening' || screen === 'result' || screen === 'recognition-check') {
      setActiveTab('home');
    }
  }, [screen]);

  const country = COUNTRY_BY_CODE[settings.selectedCountryCode] ?? COUNTRY_BY_CODE.VN;
  const exchangeRate = useMemo(() => exchangeRateService.getRate(country.currency), [country.currency, rateVersion]);
  const krwValue = useMemo(() => exchangeRateService.calculateKrw(Number(manualInput) || 0, country.currency), [country.currency, manualInput]);

  const saveSettings = async (next: AppSettings) => {
    setSettings(next);
    await settingsService.save(next);
  };

  const startListening = async () => {
    if (!isMountedRef.current || listeningRef.current) return;
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
            : '가격을 찾지 못했어요. 다시 말씀해주세요.',
          startListening,
        );
        return;
      }

      if (!isMountedRef.current) return;
      setRecognition({ amount: parsed.result.amount, text: selected?.candidate.text ?? result.recognizedText, currency });
      if (settings.vibrationOn) Vibration.vibrate(30);
      if (parsed.result.amount >= 300000 && currency === 'VND') {
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
    setManualInput(next || '0');
    setDisplayAmount(new Intl.NumberFormat('ko-KR').format(Number(next || '0')));
  };

  const handleManualBackspace = () => {
    const next = manualInput.slice(0, -1);
    setManualInput(next || '0');
    setDisplayAmount(new Intl.NumberFormat('ko-KR').format(Number(next || '0')));
  };

  const resetManualInput = () => {
    setManualInput('0');
    setDisplayAmount('0');
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
            activeTab={activeTab}
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
              setActiveTab(tab);
              if (tab === 'input') {
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
              setActiveTab(tab);
              if (tab === 'input') {
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
              setActiveTab(tab);
              if (tab === 'input') {
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
            krwAmount={exchangeRateService.formatKrw(krwValue)}
            onChange={handleManualInputChange}
            onBackspace={handleManualBackspace}
            onReset={resetManualInput}
            onBack={() => setScreen('home')}
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
              setActiveTab(tab);
              if (tab === 'input') {
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
          />
        ) : null;
      case 'settings':
        return (
          <SettingsScreenPremium
            settings={settings}
            onBack={() => setScreen('home')}
            onCountryPress={() => setScreen('country-select')}
            onRatePress={() => setScreen('exchange-rate')}
            onToggle={(key, value) => {
              const next = { ...settings, [key]: value } as AppSettings;
              saveSettings(next);
            }}
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
            activeTab={activeTab}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
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
  country,
  exchangeRate,
  onCountrySelect,
  onMicPress,
  onNavigate,
  activeTab,
}: {
  country: CountryDisplay;
  exchangeRate: ExchangeRateSnapshot;
  onCountrySelect: (code: SupportedCountryCode) => void;
  onMicPress: () => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
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
          title="PriceGo"
          rightIcon="⚙"
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
            <Text style={[styles.micPromptTitle, compact && styles.compactMicPromptTitle]}>가격을 들어볼게요</Text>
            <Text style={[styles.micPromptDesc, compact && styles.compactMicPromptDesc]}>
              버튼을 누르고{'\n'}상대방이 말하는 가격을 들려주세요.
            </Text>
            <Button
              label="직접 입력"
              onPress={() => onNavigate('input')}
              variant="secondary"
              size="medium"
              style={styles.homeManualButton}
            />
          </View>

          <View style={compact ? styles.compactSpacer : styles.spacer} />

          <ExchangeRateCard
            rateText={`1,000 ${country.currency} ≈ ${Math.round(exchangeRate.rateToKrw * 1000)} KRW`}
            updatedAt={exchangeRate.updatedAt}
            supportOffline
            compact={compact}
          />
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} />
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
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader title="PriceGo" />

        <ScrollView contentContainerStyle={styles.pagePadding} scrollEnabled={false}>
          <View style={styles.centerContent}>
            <Text style={styles.listeningTitle}>듣고 있어요...</Text>
            <Text style={styles.listeningDesc}>가격을 말씀해 주세요.</Text>

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

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} />
      </View>
    </SafeAreaView>
  );
}

function ResultScreenPremium({
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
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
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
          <StatusChip label="인식 완료" type="success" icon="✓" />

          <View style={styles.spacer} />

          <LocalCurrencyCard
            amount={new Intl.NumberFormat('ko-KR').format(localAmount)}
            currency={country.currency}
            flag={country.flag}
            compact
          />

          <Text style={styles.resultArrowDown}>↓</Text>

          <KRWResultCard
            amount={krwAmount.replace('약 ₩', '').replace(' ', '')}
            large={largeResultText}
            compact
          />

          <Card variant="filled" style={styles.resultDetailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>들은 내용</Text>
              <Text style={styles.detailValue}>{recognition?.text ?? 'ba trăm nghìn đồng'}</Text>
            </View>
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
              style={styles.buttonHalf}
            />
            <Button
              label="상대방에게 보여주기"
              onPress={onShowAmount}
              variant="secondary"
              style={styles.buttonHalf}
            />
          </View>
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} />
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
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  if (!recognition) return null;
  const amount = recognition.amount;
  const candidates = [amount, Math.floor(amount / 10), amount * 10];

  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader title="" showBack onBackPress={onReplay} />

        <ScrollView contentContainerStyle={styles.pagePadding}>
          <Text style={styles.heading}>금액을 다시 확인해 주세요</Text>
          <Text style={styles.subtitle}>아래 금액이 맞나요?</Text>

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

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} />
      </View>
    </SafeAreaView>
  );
}

function ManualInputScreenPremium({
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
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  const { height } = useWindowDimensions();
  const compact = height < 900;
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screenWithNav}>
        <ScreenHeader title="" showBack onBackPress={onBack} />

        <ScrollView
          contentContainerStyle={[styles.pagePadding, compact && styles.compactPagePadding]}
          keyboardShouldPersistTaps="handled">
          <CountrySelectorPill
            selectedCode={country.code}
            onSelect={(code) => void onCountrySelect(code as SupportedCountryCode)}
            compact={compact}
          />

          <Text style={[styles.heading, compact && styles.compactManualHeading]}>금액을 입력하세요</Text>

          <Card variant="outlined" style={compact && styles.compactManualCard}>
            <View style={styles.amountInputContainer}>
              <Text style={styles.amountInput}>{displayAmount}</Text>
            <Text style={styles.amountCurrency}>{currencyLabel(country.currency)}</Text>
            </View>
          </Card>

          <KRWResultCard
            amount={krwAmount.replace('약 ₩', '').replace(' ', '')}
            compact={compact}
          />

          <NumberPadPremium compact={compact} onPress={onChange} onBackspace={onBackspace} />

          <Button
            label="새로 입력"
            onPress={onReset}
            style={[styles.fullWidth, compact && styles.compactManualResetButton]}
          />
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ExchangeRateScreenPremium({
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
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
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

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} />
      </View>
    </SafeAreaView>
  );
}

function ShowAmountScreenPremium({
  country,
  amount,
  onBack,
}: {
  country: CountryDisplay;
  amount: number;
  onBack: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.fullScreen}>
      <Pressable
        onPress={onBack}
        style={styles.showAmountBackButton}>
        <Text style={styles.backArrow}>←</Text>
      </Pressable>
      <View style={styles.showAmountContainer}>
        <Text style={styles.showAmountText}>
          {new Intl.NumberFormat('ko-KR').format(amount)} {currencyLabel(country.currency)}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function SettingsScreenPremium({
  settings,
  onBack,
  onCountryPress,
  onRatePress,
  onToggle,
  onNavigate,
  activeTab,
}: {
  settings: AppSettings;
  onBack: () => void;
  onCountryPress: () => void;
  onRatePress: () => void;
  onToggle: (key: 'vibrationOn' | 'largeResultText', value: boolean) => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
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

        <ScrollView>
          <View style={styles.settingsSection}>
            <SettingRow
              icon={selectedCountry?.flag}
              title="여행 국가"
              value={`${selectedCountry?.name} · ${selectedCountry ? currencyLabel(selectedCountry.currency) : ''}`}
              onPress={onCountryPress}
              showChevron
            />
          </View>

          <View style={styles.settingsSection}>
            <SettingRow
              title="환율 정보"
              subtitle="최근 환율 보기"
              value="확인"
              onPress={onRatePress}
              showChevron
            />

            <SettingRow
              title="진동"
              subtitle="인식 완료 시"
              value={
                <ToggleSwitch
                  value={settings.vibrationOn}
                  onValueChange={(v) => onToggle('vibrationOn', v)}
                />
              }
            />

            <SettingRow
              title="결과 글씨 크게"
              value={
                <ToggleSwitch
                  value={settings.largeResultText}
                  onValueChange={(v) => onToggle('largeResultText', v)}
                />
              }
            />
          </View>

          <View style={styles.settingsSection}>
            <SettingRow
              title="정보"
              value={`PriceGo v${Constants.expoConfig?.version ?? '1.0.1'}`}
            />
          </View>
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} />
      </View>
    </SafeAreaView>
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
    alignSelf: 'center',
    minWidth: 160,
    marginTop: SPACING.sm,
  },
  listeningTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  listeningDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  resultMetaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  resultMetaColumn: {
    flex: 1,
    minWidth: 0,
  },
  compactManualHeading: {
    marginBottom: SPACING.xs,
  },
  compactManualCard: {
    paddingVertical: SPACING.sm,
  },
  compactManualResetButton: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
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
  amountInputContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  amountInput: {
    ...TYPOGRAPHY.amountLocal,
    color: COLORS.textPrimary,
  },
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
  settingsSection: {
    marginBottom: SPACING.lg,
  },
});
