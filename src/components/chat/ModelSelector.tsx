/**
 * ModelSelector - Dropdown/picker to select LLM provider and model.
 * Shows available providers that have API keys configured.
 */

import React, { useState, useContext, useMemo } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ChatContext } from '../../contexts/ChatContext';
import { SettingsContext } from '../../contexts/SettingsContext';
import { LLM_PROVIDERS } from '../../services/llm';

interface ProviderModelOption {
  provider: string;
  providerName: string;
  model: string;
}

export default function ModelSelector() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } =
    useContext(ChatContext);
  const { settings } = useContext(SettingsContext);
  const [showPicker, setShowPicker] = useState(false);

  // Build a list of available options (only providers with keys configured)
  const availableOptions = useMemo<ProviderModelOption[]>(() => {
    const options: ProviderModelOption[] = [];
    const configuredTypes = new Set(
      settings.llmProviders.filter((p) => p.apiKey).map((p) => p.type)
    );

    for (const provider of LLM_PROVIDERS) {
      if (configuredTypes.has(provider.id)) {
        for (const model of provider.models) {
          options.push({
            provider: provider.id,
            providerName: provider.name,
            model,
          });
        }
      }
    }

    return options;
  }, [settings.llmProviders]);

  const currentLabel = useMemo(() => {
    if (availableOptions.length === 0) {
      return 'No providers configured';
    }
    const providerInfo = LLM_PROVIDERS.find((p) => p.id === selectedProvider);
    return `${providerInfo?.name || selectedProvider} / ${selectedModel}`;
  }, [selectedProvider, selectedModel, availableOptions]);

  const handleSelect = (option: ProviderModelOption) => {
    setSelectedProvider(option.provider);
    setSelectedModel(option.model);
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowPicker(true)}
        disabled={availableOptions.length === 0}
      >
        <Ionicons name="hardware-chip-outline" size={16} color={colors.primary} />
        <Text
          style={[styles.selectorText, { color: colors.text }]}
          numberOfLines={1}
        >
          {currentLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={showPicker} transparent animationType="fade">
        <Pressable
          style={styles.overlay}
          onPress={() => setShowPicker(false)}
        >
          <View
            style={[styles.pickerContainer, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                Select Model
              </Text>
              <Pressable onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={availableOptions}
              keyExtractor={(item) => `${item.provider}-${item.model}`}
              renderItem={({ item }) => {
                const isSelected =
                  item.provider === selectedProvider && item.model === selectedModel;
                return (
                  <Pressable
                    style={[
                      styles.optionItem,
                      { borderBottomColor: colors.borderLight },
                      isSelected && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <View>
                      <Text style={[styles.optionModel, { color: colors.text }]}>
                        {item.model}
                      </Text>
                      <Text style={[styles.optionProvider, { color: colors.textSecondary }]}>
                        {item.providerName}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No providers configured. Add API keys in Settings.
                  </Text>
                </View>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    marginRight: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerContainer: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  optionModel: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionProvider: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
