import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="country-select" />
        <Stack.Screen name="listening" />
        <Stack.Screen name="result" />
        <Stack.Screen name="recognition-check" />
        <Stack.Screen name="manual-input" />
        <Stack.Screen name="exchange-rate" />
        <Stack.Screen name="show-amount" />
        <Stack.Screen name="settings" />
      </Stack>
    </View>
  );
}
