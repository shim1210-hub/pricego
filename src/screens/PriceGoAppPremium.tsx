import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { COUNTRY_BY_CODE, COUNTRY_OPTIONS, ExchangeRateService } from '@/services/exchange-rate.service';
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
        return <OnboardingScreenPremium onStart={() => setScreen('country-select')} />;
      case 'country-select':
        return (
          <CountrySelectScreenPremium
            selectedCode={settings.selectedCountryCode}
            onSelect={handleCountrySelect}
          />
        );
      case 'home':
        return (
          <HomeScreenPremium
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
            activeTab={activeTab}
          />
        );
      case 'listening':
        return (
          <ListeningScreenPremium
            country={country}
            onStop={() => setScreen('home')}
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
            amount={manualInput}
            displayAmount={displayAmount}
            krwAmount={exchangeRateService.formatKrw(krwValue)}
            onChange={handleManualInputChange}
            onBackspace={handleManualBackspace}
            onDone={() => setScreen('home')}
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
        return (
          <ShowAmountScreenPremium
            country={country}
            amount={recognition?.amount ?? 300000}
            onBack={() => setScreen('result')}
          />
        );
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
    <SafeAreaView style={styles.fullScreen}>
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
    <SafeAreaView style={styles.fullScreen}>
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
                <Text style={styles.countryCurrency}>{country.currency}</Text>
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
  onMicPress,
  onNavigate,
  activeTab,
}: {
  country: any;
  exchangeRate: any;
  onMicPress: () => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  return (
    <SafeAreaView style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader
          title="PriceGo"
          rightIcon="⚙"
          onRightPress={() => onNavigate('settings')}
        />

        <ScrollView contentContainerStyle={styles.pagePadding}>
          <OfflineBannerPremium visible={false} />

          <CountrySelectorPill
            selectedCode={country.code}
            onSelect={() => {}}
          />

          <View style={styles.spacer} />

          <View style={styles.centerContent}>
            <MicButtonPremium onPress={onMicPress} />
            <Text style={styles.micPromptTitle}>가격을 들어볼게요</Text>
            <Text style={styles.micPromptDesc}>
              버튼을 누르고{'\n'}상대방이 말하는 가격을 들려주세요.
            </Text>
          </View>

          <View style={styles.spacer} />

          <ExchangeRateCard
            rateText={`1,000 ${country.currency} ≈ ${Math.round(exchangeRate.rateToKrw * 1000)} KRW`}
            updatedAt={exchangeRate.updatedAt}
            supportOffline
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
  country: any;
  onStop: () => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  return (
    <SafeAreaView style={styles.fullScreen}>
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
  onReplay,
  onShowAmount,
  onManual,
  onNavigate,
  activeTab,
}: {
  recognition: any;
  country: any;
  exchangeRate: any;
  onReplay: () => void;
  onShowAmount: () => void;
  onManual: () => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  const localAmount = recognition?.amount ?? 300000;
  const krwAmount = exchangeRateService.formatKrw(localAmount * exchangeRate.rateToKrw);

  return (
    <SafeAreaView style={styles.fullScreen}>
      <View style={styles.screenWithNav}>
        <ScreenHeader
          title="PriceGo"
          showBack
          onBackPress={() => {}}
          rightIcon="✓"
        />

        <ScrollView contentContainerStyle={styles.pagePadding}>
          <StatusChip label="인식 완료" type="success" icon="✓" />

          <View style={styles.spacer} />

          <LocalCurrencyCard
            amount={new Intl.NumberFormat('ko-KR').format(localAmount)}
            currency={country.currency}
            flag={country.flag}
          />

          <Text style={styles.arrowDown}>↓</Text>

          <KRWResultCard
            amount={krwAmount.replace('약 ₩', '').replace(' ', '')}
          />

          <Card variant="filled" style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>들은 내용</Text>
              <Text style={styles.detailValue}>{recognition?.text ?? 'ba trăm nghìn đồng'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>적용 환율</Text>
              <Text style={styles.detailValue}>{`1,000 ${country.currency} ≈ ${Math.round(exchangeRate.rateToKrw * 1000)} KRW`}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>환율 업데이트</Text>
              <Text style={styles.detailValue}>{exchangeRate.updatedAt}</Text>
            </View>
          </Card>

          <View style={styles.spacer} />

          <Button
            label="🎤 다시 듣기"
            onPress={onReplay}
            style={styles.fullWidth}
          />

          <View style={styles.buttonRow}>
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
  country: any;
  recognition: any;
  onConfirm: (candidate: number) => void;
  onReplay: () => void;
  onManual: () => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  const amount = recognition?.amount ?? 300000;
  const candidates = [amount, Math.floor(amount / 10), amount * 10];

  return (
    <SafeAreaView style={styles.fullScreen}>
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
              label={`${new Intl.NumberFormat('ko-KR').format(candidate)} ${country.currency}`}
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
  amount,
  displayAmount,
  krwAmount,
  onChange,
  onBackspace,
  onDone,
  onNavigate,
  activeTab,
}: {
  country: any;
  amount: string;
  displayAmount: string;
  krwAmount: string;
  onChange: (value: string) => void;
  onBackspace: () => void;
  onDone: () => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  return (
    <SafeAreaView style={styles.fullScreen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screenWithNav}>
        <ScreenHeader title="" showBack onBackPress={onDone} />

        <ScrollView contentContainerStyle={styles.pagePadding}>
          <CountrySelectorPill
            selectedCode={country.code}
            onSelect={() => {}}
          />

          <Text style={styles.heading}>금액을 입력하세요</Text>

          <Card variant="outlined">
            <View style={styles.amountInputContainer}>
              <Text style={styles.amountInput}>{displayAmount}</Text>
              <Text style={styles.amountCurrency}>{country.currency}</Text>
            </View>
          </Card>

          <KRWResultCard
            amount={krwAmount.replace('약 ₩', '').replace(' ', '')}
          />

          <NumberPadPremium onPress={onChange} onBackspace={onBackspace} />

          <Button
            label="완료"
            onPress={onDone}
            style={styles.fullWidth}
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
  onBack,
  onNavigate,
  activeTab,
}: {
  country: any;
  exchangeRate: any;
  onBack: () => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  return (
    <SafeAreaView style={styles.fullScreen}>
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
                <Text style={styles.rateCurrency}>{country.currency}</Text>
              </View>
              <Text style={styles.rateArrow}>→</Text>
              <View style={styles.ratePair}>
                <Text style={styles.rateCurrency}>KRW</Text>
                <Text style={styles.rateFlag}>🇰🇷</Text>
              </View>
            </View>

            <View style={styles.spacer} />

            <Text style={styles.rateNumber}>1,000 {country.currency}</Text>
            <Text style={styles.rateResult}>≈ {Math.round(exchangeRate.rateToKrw * 1000)} KRW</Text>

            <View style={styles.spacer} />

            <Text style={styles.rateTime}>최근 업데이트</Text>
            <Text style={styles.rateTimeValue}>{exchangeRate.updatedAt}</Text>

            <View style={styles.spacer} />

            <StatusChip label="최신 환율 저장 완료" type="success" icon="✓" />
          </Card>

          <Text style={styles.infoText}>
            인터넷이 없어도{'\n'}저장된 최근 환율을 사용합니다.
          </Text>

          <Button
            label="지금 업데이트"
            onPress={() => {}}
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
  country: any;
  amount: number;
  onBack: () => void;
}) {
  return (
    <SafeAreaView style={styles.fullScreen}>
      <Pressable
        onPress={onBack}
        style={styles.showAmountBackButton}>
        <Text style={styles.backArrow}>←</Text>
      </Pressable>
      <View style={styles.showAmountContainer}>
        <Text style={styles.showAmountText}>
          {new Intl.NumberFormat('ko-KR').format(amount)} {country.currency}
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
  onToggle: (key: 'offlineFirst' | 'autoUpdate' | 'vibrationOn' | 'largeResultText', value: boolean) => void;
  onNavigate: (tab: 'home' | 'input' | 'settings') => void;
  activeTab: 'home' | 'input' | 'settings';
}) {
  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.code === settings.selectedCountryCode);

  return (
    <SafeAreaView style={styles.fullScreen}>
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
              value={`${selectedCountry?.name} · ${selectedCountry?.currency}`}
              onPress={onCountryPress}
              showChevron
            />
          </View>

          <View style={styles.settingsSection}>
            <SettingRow
              title="기준 통화"
              value="대한민국 원 (KRW)"
              onPress={() => {}}
              showChevron
            />
          </View>

          <View style={styles.settingsSection}>
            <SettingRow
              title="음성 인식"
              subtitle="오프라인 우선"
              value={
                <ToggleSwitch
                  value={settings.offlineFirst}
                  onValueChange={(v) => onToggle('offlineFirst', v)}
                />
              }
            />

            <SettingRow
              title="환율"
              subtitle="자동 업데이트"
              value={
                <ToggleSwitch
                  value={settings.autoUpdate}
                  onValueChange={(v) => onToggle('autoUpdate', v)}
                />
              }
            />

            <SettingRow
              title="환율 업데이트"
              subtitle="마지막 업데이트"
              value="09:30"
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
              value="PriceGo v1.0.0"
            />
          </View>
        </ScrollView>

        <BottomNavigationPremium activeTab={activeTab} onTabChange={onNavigate} />
      </View>
    </SafeAreaView>
  );
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
    paddingVertical: SPACING.lg,
    flexGrow: 1,
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
    ...TYPOGRAPHY.caption,
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
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600' as const,
  },
  countryCurrency: {
    ...TYPOGRAPHY.captionSmall,
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600' as const,
    marginTop: SPACING.lg,
  },
  micPromptDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
  detailRow: {
    marginBottom: SPACING.lg,
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
