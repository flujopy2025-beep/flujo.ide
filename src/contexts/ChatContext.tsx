/**
 * ChatContext - Manages chat state including messages, conversation,
 * loading state, provider/model selection, and actions.
 * Simplified for SEO assistant use case (no MCP/agent tools).
 */

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
  useRef,
  ReactNode,
} from 'react';
import { Message } from '../types';
import { getLLMService, LLMConfig, LLMMessage } from '../services/llm';
import { getStorageService } from '../services/StorageService';
import { SettingsContext } from './SettingsContext';
import { OpenAIAdapter } from '../services/llm/OpenAIAdapter';

export interface ChatContextValue {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  selectedProvider: string;
  selectedModel: string;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
  availableModels: string[];
}

export const ChatContext = createContext<ChatContextValue>({
  messages: [],
  isLoading: false,
  error: null,
  selectedProvider: 'openai',
  selectedModel: 'gpt-4o',
  setSelectedProvider: () => {},
  setSelectedModel: () => {},
  sendMessage: async () => {},
  clearConversation: () => {},
  availableModels: [],
});

interface ChatProviderProps {
  children: ReactNode;
}

/** Maximum number of messages to persist in AsyncStorage to avoid hitting size limits. */
const MAX_PERSISTED_MESSAGES = 200;

const SEO_SYSTEM_PROMPT = `You are Flujo, an AI SEO assistant. Help users analyze websites, improve their search rankings, fix SEO issues, and create content strategies. You can give specific recommendations based on audit results. Be practical and actionable.`;

export function ChatProvider({ children }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const { settings } = useContext(SettingsContext);
  const llmService = useRef(getLLMService());
  const storage = useRef(getStorageService());

  /**
   * Persist chat history with a cap to prevent exceeding AsyncStorage size limits.
   */
  const persistChatHistory = useCallback((msgs: Message[]) => {
    const trimmed = msgs.length > MAX_PERSISTED_MESSAGES
      ? msgs.slice(-MAX_PERSISTED_MESSAGES)
      : msgs;
    storage.current.saveChatHistory(trimmed);
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await storage.current.getChatHistory();
        if (history.length > 0) {
          setMessages(history);
          // Restore LLM service history (only user/assistant messages)
          const llmMessages = history
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));
          llmService.current.setHistory(llmMessages);
        }
      } catch {
        // Silently fail - start with empty history
      }
    };
    loadHistory();
  }, []);

  // Get available models based on the selected provider
  const availableModels = useMemo(() => {
    return llmService.current.getModelsForProvider(selectedProvider);
  }, [selectedProvider]);

  // When provider changes, set default model
  const handleSetProvider = useCallback(
    (provider: string) => {
      setSelectedProvider(provider);
      const models = llmService.current.getModelsForProvider(provider);
      if (models.length > 0) {
        setSelectedModel(models[0]);
      }
    },
    []
  );

  // Auto-select the first configured provider if current one has no key
  useEffect(() => {
    const currentProviderConfig = settings.llmProviders.find(
      (p) => p.type === selectedProvider && p.apiKey
    );

    if (!currentProviderConfig) {
      const firstConfigured = settings.llmProviders.find((p) => p.apiKey);
      if (firstConfigured) {
        setSelectedProvider(firstConfigured.type);
        const providerInfo = llmService.current.getProviders().find((p) => p.id === firstConfigured.type);
        if (providerInfo && providerInfo.models.length > 0) {
          setSelectedModel(providerInfo.models[0]);
        }
      }
    }
  }, [settings.llmProviders, selectedProvider]);

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);

      // Find the API key for the selected provider
      const providerConfig = settings.llmProviders.find(
        (p) => p.type === selectedProvider
      );

      if (!providerConfig || !providerConfig.apiKey) {
        setError('No API key configured for the selected provider. Add one in Settings.');
        return;
      }

      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
        provider: selectedProvider,
        model: selectedModel,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const assistantMessageId = (Date.now() + 1).toString();

      try {
        // Ensure correct baseUrl for OpenRouter
        let baseUrl = providerConfig.baseUrl;
        if (selectedProvider === 'openrouter' && !baseUrl) {
          baseUrl = 'https://openrouter.ai/api/v1';
        }

        const config: LLMConfig = {
          provider: selectedProvider as LLMConfig['provider'],
          model: selectedModel,
          apiKey: providerConfig.apiKey,
          baseUrl,
        };

        // Build conversation history for context
        const conversationHistory: LLMMessage[] = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-20)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // Use the OpenAI adapter directly for simple non-streaming call
        const adapter = new OpenAIAdapter();
        const allMessages: LLMMessage[] = [
          { role: 'system', content: SEO_SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content },
        ];

        const response = await adapter.sendMessage(allMessages, config);

        // Create assistant message
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
          provider: selectedProvider,
          model: response.model || selectedModel,
        };

        setMessages((prev) => {
          const updated = [...prev, assistantMessage];
          persistChatHistory(updated);
          return updated;
        });

        // Update LLM service history
        llmService.current.addToHistory({ role: 'user', content });
        llmService.current.addToHistory({ role: 'assistant', content: response.content });
      } catch (err) {
        let errorMessage = 'An error occurred while sending the message';
        if (err instanceof Error) {
          if (err.message.includes('404')) {
            errorMessage = `Model not found (404). The model "${selectedModel}" may not be available. Try a different model.`;
          } else if (err.message.includes('401')) {
            errorMessage = 'Invalid API key (401). Please check your key in Settings.';
          } else if (err.message.includes('429')) {
            errorMessage = 'Rate limit exceeded (429). Please wait a moment and try again.';
          } else if (err.message.includes('Network') || err.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
          } else {
            errorMessage = err.message;
          }
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedProvider, selectedModel, settings.llmProviders, persistChatHistory, messages]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    llmService.current.clearHistory();
    storage.current.clearChatHistory();
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      isLoading,
      error,
      selectedProvider,
      selectedModel,
      setSelectedProvider: handleSetProvider,
      setSelectedModel,
      sendMessage,
      clearConversation,
      availableModels,
    }),
    [
      messages,
      isLoading,
      error,
      selectedProvider,
      selectedModel,
      handleSetProvider,
      sendMessage,
      clearConversation,
      availableModels,
    ]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
