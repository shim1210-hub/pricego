import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

interface OfflineBannerProps {
  visible?: boolean;
}

export function OfflineBanner({ visible = true }: OfflineBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <ThemedText style={styles.text}>✈ 오프라인 모드 · 저장된 환율을 사용 중</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#eef7ee',
    alignSelf: 'center',
    marginBottom: 16,
  },
  text: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
});
