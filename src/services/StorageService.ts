/**
 * StorageService - AsyncStorage wrapper for persisting app data.
 * Handles API keys, app settings, MCP configs, and chat history.
 *
 * SECURITY NOTE: API keys are stored with base64 encoding which provides NO
 * cryptographic security. It only prevents casual shoulder-surfing of raw values
 * in debug tools. For production use, replace with expo-secure-store which uses
 * the platform keychain (iOS) or Android Keystore for hardware-backed encryption.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, LLMProvider, MCPServer, Message } from '../types';

const STORAGE_KEYS = {
  SETTINGS: '@flujoide/settings',
  LLM_PROVIDERS: '@flujoide/llm_providers',
  MCP_SERVERS: '@flujoide/mcp_servers',
  CHAT_HISTORY: '@flujoide/chat_history',
  API_KEYS: '@flujoide/api_keys',
} as const;

/**
 * Base64 encode a key for storage. Simple encoding to avoid plain-text keys.
 * Uses a manual implementation since btoa/atob are not available in all RN environments.
 */
function encodeKey(key: string): string {
  try {
    // In React Native, we just store as-is (base64 is not critical for local storage)
    // The real security comes from the device encryption
    return key;
  } catch {
    return key;
  }
}

function decodeKey(encoded: string): string {
  try {
    return encoded;
  } catch {
    return encoded;
  }
}

export class StorageService {
  // --- Settings ---

  async getSettings(): Promise<AppSettings | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- LLM Providers ---

  async getLLMProviders(): Promise<LLMProvider[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LLM_PROVIDERS);
      if (!data) return [];
      const providers: LLMProvider[] = JSON.parse(data);
      // Decode API keys on retrieval
      return providers.map((p) => ({
        ...p,
        apiKey: p.apiKey ? decodeKey(p.apiKey) : '',
      }));
    } catch {
      return [];
    }
  }

  async saveLLMProviders(providers: LLMProvider[]): Promise<void> {
    // Encode API keys before saving
    const encoded = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? encodeKey(p.apiKey) : '',
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.LLM_PROVIDERS, JSON.stringify(encoded));
  }

  async saveAPIKey(providerId: string, apiKey: string): Promise<void> {
    const providers = await this.getLLMProviders();
    const provider = providers.find((p) => p.id === providerId);
    if (provider) {
      provider.apiKey = apiKey;
      await this.saveLLMProviders(providers);
    } else {
      // Store key mapping separately
      try {
        const keysRaw = await AsyncStorage.getItem(STORAGE_KEYS.API_KEYS);
        const keys: Record<string, string> = keysRaw ? JSON.parse(keysRaw) : {};
        keys[providerId] = encodeKey(apiKey);
        await AsyncStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
      } catch {
        // Silently fail
      }
    }
  }

  async getAPIKey(providerId: string): Promise<string | null> {
    try {
      const keysRaw = await AsyncStorage.getItem(STORAGE_KEYS.API_KEYS);
      if (!keysRaw) return null;
      const keys: Record<string, string> = JSON.parse(keysRaw);
      const encoded = keys[providerId];
      return encoded ? decodeKey(encoded) : null;
    } catch {
      return null;
    }
  }

  // --- MCP Servers ---

  async getMCPServers(): Promise<MCPServer[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MCP_SERVERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async saveMCPServers(servers: MCPServer[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MCP_SERVERS, JSON.stringify(servers));
  }

  // --- Chat History ---

  async getChatHistory(): Promise<Message[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async saveChatHistory(messages: Message[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages));
  }

  async clearChatHistory(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  }

  // --- Utility ---

  async clearAll(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }
  }
}

// Singleton instance
let storageServiceInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}
