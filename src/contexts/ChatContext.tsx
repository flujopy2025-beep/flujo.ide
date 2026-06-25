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
import { runAgentLoop } from '../services/llm/AgentService';
import { OpenAIMessage } from '../services/llm/OpenAIAdapter';

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
  const { tools: mcpTools, callToolByName } = useContext(MCPContext);
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

  // Auto-select the first configured provider if current one has no key
  useEffect(() => {
    const currentProviderConfig = settings.llmProviders.find(
      (p) => p.type === selectedProvider && p.apiKey
    );

    if (!currentProviderConfig) {
      // Find first provider with a key
      const firstConfigured = settings.llmProviders.find((p) => p.apiKey);
      if (firstConfigured) {
        setSelectedProvider(firstConfigured.type);
        // Set the first model for that provider
        const providerInfo = llmService.current.getProviders().find((p) => p.id === firstConfigured.type);
        if (providerInfo && providerInfo.models.length > 0) {
          setSelectedModel(providerInfo.models[0]);
        }
      }
    }
  }, [settings.llmProviders, selectedProvider]);

  /**
   * Build the agentic system prompt for the AI coding assistant.
   */
  const buildSystemPrompt = useCallback((): string => {
    return `You are Flujo IDE, an AI coding assistant running on mobile. You have access to the user's workspace files. You can read, write, create, and search files. When the user asks you to create, modify, or explain code, use your tools to interact with their project directly. Be proactive - if the user asks to create a component, actually create the file. If they ask to fix a bug, read the file first, then write the fix.

Available tools:
- read_file: Read file contents from the workspace
- write_file: Write/overwrite file contents
- create_file: Create a new file
- delete_file: Delete a file
- list_files: List directory contents
- search_files: Search for text across files

Always use tools when file operations are needed. Do not just describe what to do - actually do it.`;
  }, []);

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

      // Create a unique ID for the assistant response
      const assistantMessageId = (Date.now() + 1).toString();

      try {
        // Ensure correct baseUrl for OpenRouter even if not stored properly
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

        const systemPrompt = buildSystemPrompt();

        // Build conversation history in OpenAI message format (excluding current message)
        const conversationHistory: OpenAIMessage[] = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-20) // Keep last 20 messages for context window
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // Add a placeholder assistant message with loading indicator
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: '...',
          timestamp: Date.now(),
          provider: selectedProvider,
          model: selectedModel,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Run the agent loop
        const result = await runAgentLoop({
          userMessage: userMessage.content,
          systemPrompt,
          config,
          conversationHistory,
          mcpTools,
          callMCPTool: callToolByName,
          onProgress: {
            onToolCall: (toolName: string, args: Record<string, unknown>) => {
              // Add a tool call message to show progress
              const tcMessage: Message = {
                id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: 'assistant',
                content: `Using tool: ${toolName}`,
                timestamp: Date.now(),
                toolCalls: [{ id: `call-${Date.now()}`, name: toolName, arguments: args }],
              };
              setMessages((prev) => [...prev, tcMessage]);
            },
            onToolResult: (toolName: string, resultContent: string, isError: boolean) => {
              // Add a tool result message
              const trMessage: Message = {
                id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: 'tool',
                content: resultContent.slice(0, 500) + (resultContent.length > 500 ? '\n...(truncated)' : ''),
                timestamp: Date.now(),
                toolResult: {
                  toolCallId: `call-${Date.now()}`,
                  toolName,
                  isError,
                },
              };
              setMessages((prev) => [...prev, trMessage]);
            },
          },
        });

        // Update the placeholder with the real response
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: result.content, model: result.model }
              : m
          )
        );

        // Update LLM service history for non-agent fallback compatibility
        llmService.current.addToHistory({ role: 'user', content: userMessage.content });
        llmService.current.addToHistory({ role: 'assistant', content: result.content });

        // Save chat history
        setMessages((prev) => {
          persistChatHistory(prev);
          return prev;
        });
      } catch (err) {
        let errorMessage = 'An error occurred while sending the message';
        if (err instanceof Error) {
          // Make error messages more user-friendly
          if (err.message.includes('404')) {
            errorMessage = `Model not found (404). The model "${selectedModel}" may not be available. Try selecting a different model.`;
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

        // Remove the placeholder assistant message on error
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => m.id !== assistantMessageId
          );
          return filtered;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedProvider, selectedModel, settings.llmProviders, mcpTools, callToolByName, buildSystemPrompt, persistChatHistory, messages]
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
