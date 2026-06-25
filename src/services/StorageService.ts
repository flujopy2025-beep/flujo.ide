/**
 * StorageService - Simple AsyncStorage wrapper for persisting app data.
 * Keys stored as plain text (device encryption handles security).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, LLMProvider, MCPServer, Message } from '../types';

const STORAGE_KEYS = {
  SETTINGS: '@flujoide/settings',
  LLM_PROVIDERS: '@flujoide/llm_providers',
  MCP_SERVERS: '@flujoide/mcp_servers',
  CHAT_HISTORY: '@flujoide/chat_history',
} as const;

export class StorageService {
  // --- Settings ---

  async getSettings(): Promise<AppSettings | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return null;
      return JSON.parse(data) as AppSettings;
    } catch (e) {
      console.warn('[StorageService] getSettings error:', e);
      return null;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      // Save settings without llmProviders (stored separately)
      const toSave = { ...settings, llmProviders: undefined };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(toSave));
    } catch (e) {
      console.warn('[StorageService] saveSettings error:', e);
    }
  }

  // --- LLM Providers ---

  async getLLMProviders(): Promise<LLMProvider[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LLM_PROVIDERS);
      if (!data) return [];
      return JSON.parse(data) as LLMProvider[];
    } catch (e) {
      console.warn('[StorageService] getLLMProviders error:', e);
      return [];
    }
  }

  async saveLLMProviders(providers: LLMProvider[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LLM_PROVIDERS, JSON.stringify(providers));
    } catch (e) {
      console.warn('[StorageService] saveLLMProviders error:', e);
    }
  }

  // --- MCP Servers ---

  async getMCPServers(): Promise<MCPServer[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MCP_SERVERS);
      if (!data) return [];
      return JSON.parse(data) as MCPServer[];
    } catch (e) {
      console.warn('[StorageService] getMCPServers error:', e);
      return [];
    }
  }

  async saveMCPServers(servers: MCPServer[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MCP_SERVERS, JSON.stringify(servers));
    } catch (e) {
      console.warn('[StorageService] saveMCPServers error:', e);
    }
  }

  // --- Chat History ---

  async getChatHistory(): Promise<Message[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (!data) return [];
      return JSON.parse(data) as Message[];
    } catch (e) {
      console.warn('[StorageService] getChatHistory error:', e);
      return [];
    }
  }

  async saveChatHistory(messages: Message[]): Promise<void> {
    try {
      // Cap at 200 messages
      const capped = messages.slice(-200);
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(capped));
    } catch (e) {
      console.warn('[StorageService] saveChatHistory error:', e);
    }
  }

  async clearChatHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    } catch (e) {
      console.warn('[StorageService] clearChatHistory error:', e);
    }
  }

  // --- Utility ---

  async clearAll(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (e) {
      console.warn('[StorageService] clearAll error:', e);
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
