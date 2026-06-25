import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import { ChatProvider } from '../src/contexts/ChatContext';

export default function RootLayout() {
  return (
    <ThemeProvider initialMode="dark">
      <SettingsProvider>
        <ChatProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ChatProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
