/**
 * Settings Tab Screen - LLM provider API key management, theme selection,
 * editor settings, and about section.
 */

import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { SettingsContext } from '../../src/contexts/SettingsContext';
import { LLM_PROVIDERS } from '../../src/services/llm';
import { LLMProvider } from '../../src/types';

interface ProviderKeyEntry {
  type: 'openai' | 'anthropic' | 'google';
  name: string;
  key: string;
  visible: boolean;
}

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
    setProviderKeys((prev) =>
      prev.map((entry) => {
        const existing = settings.llmProviders.find((lp) => lp.type === entry.type);
        if (existing && existing.apiKey !== entry.key) {
          return { ...entry, key: existing.apiKey };
        }
        return entry;
      })
    );
  }, [settings.llmProviders]);

  const handleSaveKey = useCallback(
    (type: 'openai' | 'anthropic' | 'google', key: string) => {
      const existing = settings.llmProviders.find((p) => p.type === type);
      const providerInfo = LLM_PROVIDERS.find((p) => p.id === type);

      if (existing) {
        updateLLMProvider(existing.id, { apiKey: key });
      } else if (key.trim()) {
        const newProvider: LLMProvider = {
          id: `${type}-${Date.now()}`,
          name: providerInfo?.name || type,
          type,
          apiKey: key.trim(),
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          App configuration and preferences
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* LLM Providers Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            LLM PROVIDERS
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Add your API keys to enable AI chat. Keys are stored locally on your device.
          </Text>

          {providerKeys.map((entry) => (
            <View
              key={entry.type}
              style={[styles.providerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.providerName, { color: colors.text }]}>
                {entry.name}
              </Text>
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
                  onBlur={() => handleSaveKey(entry.type, entry.key)}
                  secureTextEntry={!entry.visible}
                  autoCapitalize="none"
                  autoCorrect={false}
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
              {entry.key.trim() !== '' && (
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    Key configured
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            APPEARANCE
          </Text>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
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
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Editor Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            EDITOR
          </Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
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
              <Text style={[styles.numberValue, { color: colors.text }]}>
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

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
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
              <Text style={[styles.numberValue, { color: colors.text }]}>
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

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Word Wrap</Text>
              <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                Wrap long lines in the editor
              </Text>
            </View>
            <Switch
              value={settings.wordWrap}
              onValueChange={(val) => updateSettings({ wordWrap: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ABOUT
          </Text>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>App Name</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Flujo IDE</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>License</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>MIT</Text>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  providerCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
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
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
