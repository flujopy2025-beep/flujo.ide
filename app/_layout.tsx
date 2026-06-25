import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { EditorProvider } from '../src/contexts/EditorContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import { ChatProvider } from '../src/contexts/ChatContext';
import { MCPProvider } from '../src/contexts/MCPContext';

export default function RootLayout() {
  return (
    <ThemeProvider initialMode="dark">
      <SettingsProvider>
        <MCPProvider>
          <ChatProvider>
            <EditorProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
            </EditorProvider>
          </ChatProvider>
        </MCPProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
