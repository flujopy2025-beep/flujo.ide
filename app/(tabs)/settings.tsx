/**
 * Settings Tab Screen - Professional settings with Flujo IDE branding,
 * LLM provider API key management (including OpenRouter), theme selection,
 * and editor settings.
 */

import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { SettingsContext } from '../../src/contexts/SettingsContext';
import { LLM_PROVIDERS } from '../../src/services/llm';
import { LLMProvider } from '../../src/types';

const BRAND_CYAN = '#00D4FF';

interface ProviderKeyEntry {
  type: 'openai' | 'anthropic' | 'google' | 'openrouter';
  name: string;
  key: string;
  visible: boolean;
}

function SettingsLogo() {
  return (
    <View style={logoStyles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={logoStyles.image}
        resizeMode="contain"
      />
      <View style={logoStyles.textContainer}>
        <Text style={logoStyles.title}>Flujo IDE</Text>
        <Text style={logoStyles.subtitle}>Settings & Configuration</Text>
      </View>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND_CYAN,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2,
  },
});

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { colors } = theme;
  const { settings, updateSettings, updateLLMProvider, addLLMProvider } =
    useContext(SettingsContext);

  // Track API key inputs and visibility
  const [providerKeys, setProviderKeys] = useState<ProviderKeyEntry[]>(() =>
    LLM_PROVIDERS.map((p) => {
      const existing = settings.llmProviders.find((lp) => lp.type === p.id);
      return {
        type: p.id,
        name: p.name,
        key: existing?.apiKey || '',
        visible: false,
      };
    })
  );

  // Sync when settings change externally
  React.useEffect(() => {
    setProviderKeys((prev) => {
      // Check if there are new providers not yet tracked
      const tracked = new Set(prev.map((e) => e.type));
      const newEntries = LLM_PROVIDERS
        .filter((p) => !tracked.has(p.id))
        .map((p) => {
          const existing = settings.llmProviders.find((lp) => lp.type === p.id);
          return {
            type: p.id,
            name: p.name,
            key: existing?.apiKey || '',
            visible: false,
          };
        });

      const updated = prev.map((entry) => {
        const existing = settings.llmProviders.find((lp) => lp.type === entry.type);
        if (existing && existing.apiKey !== entry.key) {
          return { ...entry, key: existing.apiKey };
        }
        return entry;
      });

      return [...updated, ...newEntries];
    });
  }, [settings.llmProviders]);

  const handleSaveKey = useCallback(
    (type: 'openai' | 'anthropic' | 'google' | 'openrouter', key: string) => {
      const existing = settings.llmProviders.find((p) => p.type === type);
      const providerInfo = LLM_PROVIDERS.find((p) => p.id === type);
      const baseUrl = type === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined;

      if (existing) {
        // Always update apiKey AND baseUrl (ensures OpenRouter URL is set even for old installs)
        const updates: Partial<LLMProvider> = { apiKey: key.trim() };
        if (baseUrl) {
          updates.baseUrl = baseUrl;
        }
        updateLLMProvider(existing.id, updates);
      } else if (key.trim()) {
        const newProvider: LLMProvider = {
          id: `${type}-${Date.now()}`,
          name: providerInfo?.name || type,
          type,
          apiKey: key.trim(),
          baseUrl,
          model: providerInfo?.models[0] || '',
          isActive: true,
        };
        addLLMProvider(newProvider);
      }
    },
    [settings.llmProviders, updateLLMProvider, addLLMProvider]
  );

  const toggleKeyVisibility = (type: string) => {
    setProviderKeys((prev) =>
      prev.map((entry) =>
        entry.type === type ? { ...entry, visible: !entry.visible } : entry
      )
    );
  };

  const updateKeyValue = (type: string, value: string) => {
    setProviderKeys((prev) =>
      prev.map((entry) =>
        entry.type === type ? { ...entry, key: value } : entry
      )
    );
  };

  const getProviderIcon = (type: string): string => {
    switch (type) {
      case 'openai': return 'logo-electron';
      case 'anthropic': return 'cube-outline';
      case 'google': return 'diamond-outline';
      case 'openrouter': return 'git-network-outline';
      default: return 'key-outline';
    }
  };

  const getProviderDescription = (type: string): string => {
    switch (type) {
      case 'openai': return 'GPT-4o, GPT-4o-mini, GPT-3.5';
      case 'anthropic': return 'Claude 3.5 Sonnet, Haiku, Opus';
      case 'google': return 'Gemini 1.5 Pro, Flash';
      case 'openrouter': return 'Free models: Gemma 4, Llama 3.3, Qwen3, GPT-OSS';
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Logo */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SettingsLogo />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* LLM Providers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={16} color={BRAND_CYAN} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              AI Providers
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Add your API keys to enable AI chat. Keys are stored locally on your device.
          </Text>

          {providerKeys.map((entry) => (
            <View
              key={entry.type}
              style={[
                styles.providerCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: entry.key.trim() ? BRAND_CYAN + '40' : colors.border,
                },
              ]}
            >
              <View style={styles.providerHeader}>
                <View style={[styles.providerIconContainer, { backgroundColor: BRAND_CYAN + '15' }]}>
                  <Ionicons
                    name={getProviderIcon(entry.type) as any}
                    size={18}
                    color={BRAND_CYAN}
                  />
                </View>
                <View style={styles.providerInfo}>
                  <Text style={[styles.providerName, { color: colors.text }]}>
                    {entry.name}
                  </Text>
                  <Text style={[styles.providerDescription, { color: colors.textMuted }]}>
                    {getProviderDescription(entry.type)}
                  </Text>
                </View>
                {entry.key.trim() !== '' && (
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  </View>
                )}
              </View>

              <View style={styles.keyInputRow}>
                <TextInput
                  style={[
                    styles.keyInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder={`Enter ${entry.name} API key`}
                  placeholderTextColor={colors.textMuted}
                  value={entry.key}
                  onChangeText={(val) => updateKeyValue(entry.type, val)}
                  onEndEditing={() => handleSaveKey(entry.type, entry.key)}
                  onSubmitEditing={() => handleSaveKey(entry.type, entry.key)}
                  secureTextEntry={!entry.visible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                <Pressable
                  style={[styles.visibilityButton, { backgroundColor: colors.surfaceHover }]}
                  onPress={() => toggleKeyVisibility(entry.type)}
                >
                  <Ionicons
                    name={entry.visible ? 'eye-off' : 'eye'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              {/* Save Button */}
              <Pressable
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: entry.key.trim() ? BRAND_CYAN : colors.surfaceHover,
                    opacity: entry.key.trim() ? 1 : 0.5,
                  },
                ]}
                onPress={() => handleSaveKey(entry.type, entry.key)}
                disabled={!entry.key.trim()}
              >
                <Ionicons
                  name="save-outline"
                  size={16}
                  color={entry.key.trim() ? '#0D1117' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: entry.key.trim() ? '#0D1117' : colors.textMuted },
                  ]}
                >
                  Save Key
                </Text>
              </Pressable>

              {entry.type === 'openrouter' && (
                <Text style={[styles.providerNote, { color: colors.textMuted }]}>
                  Base URL: https://openrouter.ai/api/v1
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette" size={16} color={BRAND_CYAN} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Appearance
            </Text>
          </View>

          <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Theme</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                  Use dark color scheme
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => {
                  toggleTheme();
                  updateSettings({ theme: isDark ? 'light' : 'dark' });
                }}
                trackColor={{ false: colors.border, true: BRAND_CYAN }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Editor Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="code-slash" size={16} color={BRAND_CYAN} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Editor
            </Text>
          </View>

          <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Font Size</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                  Editor font size in pixels
                </Text>
              </View>
              <View style={styles.numberControl}>
                <Pressable
                  style={[styles.numberButton, { backgroundColor: colors.surfaceHover }]}
                  onPress={() =>
                    updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })
                  }
                >
                  <Text style={[styles.numberButtonText, { color: colors.text }]}>-</Text>
                </Pressable>
                <Text style={[styles.numberValue, { color: BRAND_CYAN }]}>
                  {settings.fontSize}
                </Text>
                <Pressable
                  style={[styles.numberButton, { backgroundColor: colors.surfaceHover }]}
                  onPress={() =>
                    updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })
                  }
                >
                  <Text style={[styles.numberButtonText, { color: colors.text }]}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Tab Size</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                  Number of spaces per tab
                </Text>
              </View>
              <View style={styles.numberControl}>
                <Pressable
                  style={[styles.numberButton, { backgroundColor: colors.surfaceHover }]}
                  onPress={() =>
                    updateSettings({ tabSize: Math.max(1, settings.tabSize - 1) })
                  }
                >
                  <Text style={[styles.numberButtonText, { color: colors.text }]}>-</Text>
                </Pressable>
                <Text style={[styles.numberValue, { color: BRAND_CYAN }]}>
                  {settings.tabSize}
                </Text>
                <Pressable
                  style={[styles.numberButton, { backgroundColor: colors.surfaceHover }]}
                  onPress={() =>
                    updateSettings({ tabSize: Math.min(8, settings.tabSize + 1) })
                  }
                >
                  <Text style={[styles.numberButtonText, { color: colors.text }]}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Word Wrap</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                  Wrap long lines in the editor
                </Text>
              </View>
              <Switch
                value={settings.wordWrap}
                onValueChange={(val) => updateSettings({ wordWrap: val })}
                trackColor={{ false: colors.border, true: BRAND_CYAN }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={16} color={BRAND_CYAN} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              About
            </Text>
          </View>

          <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.aboutRow, { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Version</Text>
              <Text style={[styles.aboutValue, { color: colors.text }]}>1.0.0</Text>
            </View>
            <View style={[styles.aboutRow, { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>App Name</Text>
              <Text style={[styles.aboutValue, { color: colors.text }]}>Flujo IDE</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>License</Text>
              <Text style={[styles.aboutValue, { color: colors.text }]}>MIT</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
  providerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  providerDescription: {
    fontSize: 11,
    marginTop: 2,
  },
  providerNote: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    marginLeft: 8,
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  visibilityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  settingCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  numberControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  numberValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
