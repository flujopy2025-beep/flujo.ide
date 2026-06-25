/**
 * SettingsContext - Manages app settings state including
 * LLM provider API keys, theme preferences, and editor settings.
 */

import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AppSettings, LLMProvider } from '../types';
import { getStorageService } from '../services/StorageService';
import { useTheme } from '../hooks/useTheme';

export interface SettingsContextValue {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (partial: Partial<AppSettings>) => void;
  addLLMProvider: (provider: LLMProvider) => void;
  updateLLMProvider: (id: string, updates: Partial<LLMProvider>) => void;
  removeLLMProvider: (id: string) => void;
  /** Look up API key by provider type (e.g., 'openai', 'anthropic', 'google'). */
  getProviderAPIKey: (providerType: string) => string;
  /** Look up a provider entry by type. Returns undefined if not found. */
  getProviderByType: (providerType: string) => LLMProvider | undefined;
  setActiveProvider: (id: string) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'monospace',
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  autoSave: false,
  llmProviders: [],
  mcpServers: [],
  activeProviderId: undefined,
};

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  updateSettings: () => {},
  addLLMProvider: () => {},
  updateLLMProvider: () => {},
  removeLLMProvider: () => {},
  getProviderAPIKey: () => '',
  getProviderByType: () => undefined,
  setActiveProvider: () => {},
});

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { setThemeMode } = useTheme();
  const storage = useMemo(() => getStorageService(), []);

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await storage.getSettings();
        const savedProviders = await storage.getLLMProviders();

        if (savedSettings) {
          const merged = {
            ...DEFAULT_SETTINGS,
            ...savedSettings,
            llmProviders: savedProviders.length > 0 ? savedProviders : savedSettings.llmProviders || [],
          };
          setSettings(merged);
          setThemeMode(merged.theme);
        }
      } catch {
        // Use default settings on error
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [storage, setThemeMode]);

  const persistSettings = useCallback(
    async (newSettings: AppSettings) => {
      await storage.saveSettings(newSettings);
      await storage.saveLLMProviders(newSettings.llmProviders);
    },
    [storage]
  );

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...partial };
        if (partial.theme) {
          setThemeMode(partial.theme);
        }
        persistSettings(updated);
        return updated;
      });
    },
    [persistSettings, setThemeMode]
  );

  const addLLMProvider = useCallback(
    (provider: LLMProvider) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          llmProviders: [...prev.llmProviders, provider],
        };
        persistSettings(updated);
        return updated;
      });
    },
    [persistSettings]
  );

  const updateLLMProvider = useCallback(
    (id: string, updates: Partial<LLMProvider>) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          llmProviders: prev.llmProviders.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        };
        persistSettings(updated);
        return updated;
      });
    },
    [persistSettings]
  );

  const removeLLMProvider = useCallback(
    (id: string) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          llmProviders: prev.llmProviders.filter((p) => p.id !== id),
          activeProviderId: prev.activeProviderId === id ? undefined : prev.activeProviderId,
        };
        persistSettings(updated);
        return updated;
      });
    },
    [persistSettings]
  );

  const getProviderAPIKey = useCallback(
    (providerType: string): string => {
      const provider = settings.llmProviders.find((p) => p.type === providerType);
      return provider?.apiKey || '';
    },
    [settings.llmProviders]
  );

  /**
   * Look up a provider entry by type (e.g., 'openai', 'anthropic', 'google').
   * Use this instead of searching by id to avoid coupling issues between
   * provider.id (dynamic, e.g. 'openai-1719000000') and provider.type (static enum).
   */
  const getProviderByType = useCallback(
    (providerType: string): LLMProvider | undefined => {
      return settings.llmProviders.find((p) => p.type === providerType);
    },
    [settings.llmProviders]
  );

  const setActiveProvider = useCallback(
    (id: string) => {
      setSettings((prev) => {
        const updated = { ...prev, activeProviderId: id };
        persistSettings(updated);
        return updated;
      });
    },
    [persistSettings]
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isLoading,
      updateSettings,
      addLLMProvider,
      updateLLMProvider,
      removeLLMProvider,
      getProviderAPIKey,
      getProviderByType,
      setActiveProvider,
    }),
    [
      settings,
      isLoading,
      updateSettings,
      addLLMProvider,
      updateLLMProvider,
      removeLLMProvider,
      getProviderAPIKey,
      getProviderByType,
      setActiveProvider,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
