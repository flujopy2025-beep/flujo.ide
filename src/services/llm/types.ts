/**
 * LLM Service Layer Types
 * Defines interfaces for the adapter pattern supporting multiple LLM providers.
 */

export type LLMRole = 'user' | 'assistant' | 'system';

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage?: LLMUsage;
  model?: string;
  finishReason?: string;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
  usage?: LLMUsage;
}

export interface LLMAdapter {
  /** Send a message and get a complete response */
  sendMessage(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;

  /** Send a message and get a streaming response via callback */
  streamMessage(
    messages: LLMMessage[],
    config: LLMConfig,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void>;

  /** List available models for this provider */
  listModels(): string[];
}

export interface LLMProviderInfo {
  id: 'openai' | 'anthropic' | 'google' | 'openrouter';
  name: string;
  models: string[];
}
