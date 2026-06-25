/**
 * ChatContext - Manages chat state including messages, conversation,
 * loading state, provider/model selection, and actions.
 * Supports tool use messages (tool calls from LLM and tool results).
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
import { Message, ToolCallInfo, ToolResultInfo } from '../types';
import { getLLMService, LLMConfig } from '../services/llm';
import { getStorageService } from '../services/StorageService';
import { SettingsContext } from './SettingsContext';
import { MCPContext } from './MCPContext';
import { formatToolsForProvider } from '../services/llm/MCPToolIntegration';
import { MCPTool } from '../services/mcp';

export interface ChatContextValue {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  selectedProvider: string;
  selectedModel: string;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  sendMessage: (content: string, fileContext?: string) => Promise<void>;
  clearConversation: () => void;
  availableModels: string[];
  /** Add a tool call message (assistant made tool calls) */
  addToolCallMessage: (toolCalls: ToolCallInfo[]) => void;
  /** Add a tool result message */
  addToolResultMessage: (toolCallId: string, toolName: string, result: string, isError: boolean) => void;
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
  addToolCallMessage: () => {},
  addToolResultMessage: () => {},
});

interface ChatProviderProps {
  children: ReactNode;
}

/** Maximum number of messages to persist in AsyncStorage to avoid hitting size limits. */
const MAX_PERSISTED_MESSAGES = 200;

export function ChatProvider({ children }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const { settings } = useContext(SettingsContext);
  const { tools: mcpTools } = useContext(MCPContext);
  const llmService = useRef(getLLMService());
  const storage = useRef(getStorageService());

  /**
   * Persist chat history with a cap to prevent exceeding AsyncStorage size limits.
   * Only the most recent messages are kept.
   */
  const persistChatHistory = useCallback((messages: Message[]) => {
    const trimmed = messages.length > MAX_PERSISTED_MESSAGES
      ? messages.slice(-MAX_PERSISTED_MESSAGES)
      : messages;
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

  /**
   * Build a system prompt that includes MCP tool descriptions when tools are available.
   * This makes the LLM aware of connected MCP tools so it can reference them.
   */
  const buildSystemPrompt = useCallback(
    (basePrompt: string, provider: string, tools: MCPTool[]): string => {
      if (tools.length === 0) return basePrompt;

      const formattedTools = formatToolsForProvider(
        tools,
        provider as 'openai' | 'anthropic' | 'google'
      );
      const toolDescriptions = tools
        .map((t) => `- ${t.name}: ${t.description || 'No description'}`)
        .join('\n');

      return `${basePrompt}\n\nYou have access to the following MCP tools from connected servers. Mention them when relevant:\n${toolDescriptions}\n\n(Tool definitions: ${JSON.stringify(formattedTools).slice(0, 2000)})`;
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, fileContext?: string) => {
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
        content: fileContext ? `[File Context]\n${fileContext}\n\n${content}` : content,
        timestamp: Date.now(),
        provider: selectedProvider,
        model: selectedModel,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const config: LLMConfig = {
          provider: selectedProvider as LLMConfig['provider'],
          model: selectedModel,
          apiKey: providerConfig.apiKey,
          baseUrl: providerConfig.baseUrl,
        };

        const systemPrompt = buildSystemPrompt(
          'You are Flujo IDE, an AI coding assistant in a mobile code editor. Help with coding questions, explain code, suggest improvements, and assist with debugging. Be concise and provide code examples when relevant.',
          selectedProvider,
          mcpTools
        );

        // Use streaming for a better UX
        const assistantMessageId = (Date.now() + 1).toString();
        let accumulatedContent = '';

        // Add a placeholder assistant message
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          provider: selectedProvider,
          model: selectedModel,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        await llmService.current.streamMessage(
          userMessage.content,
          config,
          (chunk) => {
            if (chunk.content) {
              accumulatedContent += chunk.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: accumulatedContent }
                    : m
                )
              );
            }
          },
          systemPrompt
        );

        // Save chat history
        setMessages((prev) => {
          persistChatHistory(prev);
          return prev;
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred while sending the message';
        setError(errorMessage);

        // Remove the empty assistant message on error
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => !(m.role === 'assistant' && m.content === '')
          );
          return filtered;
        });

        // Also remove from LLM service history (the last user+assistant pair)
        const history = llmService.current.getConversationHistory();
        if (history.length >= 2) {
          llmService.current.setHistory(history.slice(0, -2));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [selectedProvider, selectedModel, settings.llmProviders, mcpTools, buildSystemPrompt, persistChatHistory]
  );

  const addToolCallMessage = useCallback((toolCalls: ToolCallInfo[]) => {
    const toolCallNames = toolCalls.map((tc) => tc.name).join(', ');
    const message: Message = {
      id: `tool-call-${Date.now()}`,
      role: 'assistant',
      content: `Using tools: ${toolCallNames}`,
      timestamp: Date.now(),
      toolCalls,
    };
    setMessages((prev) => {
      const updated = [...prev, message];
      persistChatHistory(updated);
      return updated;
    });
  }, [persistChatHistory]);

  const addToolResultMessage = useCallback(
    (toolCallId: string, toolName: string, result: string, isError: boolean) => {
      const message: Message = {
        id: `tool-result-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'tool',
        content: result,
        timestamp: Date.now(),
        toolResult: {
          toolCallId,
          toolName,
          isError,
        },
      };
      setMessages((prev) => {
        const updated = [...prev, message];
        persistChatHistory(updated);
        return updated;
      });
    },
    [persistChatHistory]
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
      addToolCallMessage,
      addToolResultMessage,
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
      addToolCallMessage,
      addToolResultMessage,
    ]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
