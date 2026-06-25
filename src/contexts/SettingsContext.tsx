/**
 * SettingsContext - Manages app settings state including
 * LLM provider API keys, theme preferences, and editor settings.
 *
 * Persistence: all changes are saved to AsyncStorage immediately.
 */

import React, { createContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
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
  getProviderAPIKey: (providerType: string) => string;
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
  const storageRef = useRef(getStorageService());

  // Load settings from storage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const storage = storageRef.current;
        const [savedSettings, savedProviders] = await Promise.all([
          storage.getSettings(),
          storage.getLLMProviders(),
        ]);

        const merged: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...(savedSettings || {}),
          llmProviders: savedProviders.length > 0 ? savedProviders : [],
        };

        setSettings(merged);
        if (merged.theme) {
          setThemeMode(merged.theme);
        }
      } catch (e) {
        console.warn('[SettingsProvider] Failed to load settings:', e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [setThemeMode]);

  // Persist function — fire and forget but with logging
  const persist = useCallback(async (newSettings: AppSettings) => {
    const storage = storageRef.current;
    try {
      await Promise.all([
        storage.saveSettings(newSettings),
        storage.saveLLMProviders(newSettings.llmProviders),
      ]);
    } catch (e) {
      console.warn('[SettingsProvider] Failed to persist:', e);
    }
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...partial };
        if (partial.theme) {
          setThemeMode(partial.theme);
        }
        // Persist async
        persist(updated);
        return updated;
      });
    },
    [persist, setThemeMode]
  );

  const addLLMProvider = useCallback(
    (provider: LLMProvider) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          llmProviders: [...prev.llmProviders, provider],
        };
        persist(updated);
        return updated;
      });
    },
    [persist]
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
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  const removeLLMProvider = useCallback(
    (id: string) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          llmProviders: prev.llmProviders.filter((p) => p.id !== id),
          activeProviderId: prev.activeProviderId === id ? undefined : prev.activeProviderId,
        };
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  const getProviderAPIKey = useCallback(
    (providerType: string): string => {
      const provider = settings.llmProviders.find((p) => p.type === providerType);
      return provider?.apiKey || '';
    },
    [settings.llmProviders]
  );

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
        persist(updated);
        return updated;
      });
    },
    [persist]
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
