import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { EditorProvider } from '../src/contexts/EditorContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import { ChatProvider } from '../src/contexts/ChatContext';
import { MCPProvider } from '../src/contexts/MCPContext';

function useOnboardingCheck() {
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const value = await AsyncStorage.getItem('@flujo_onboarding_complete');
        setShowOnboarding(value !== 'true');
      } catch {
        setShowOnboarding(false);
      } finally {
        setIsReady(true);
      }
    };
    check();
  }, []);

  return { isReady, showOnboarding };
}

export default function RootLayout() {
  const { isReady, showOnboarding } = useOnboardingCheck();

  if (!isReady) {
    return null;
  }

  return (
    <ThemeProvider initialMode="dark">
      <SettingsProvider>
        <MCPProvider>
          <ChatProvider>
            <EditorProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }}>
                {showOnboarding ? (
                  <Stack.Screen name="onboarding" />
                ) : (
                  <Stack.Screen name="(tabs)" />
                )}
              </Stack>
            </EditorProvider>
          </ChatProvider>
        </MCPProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
