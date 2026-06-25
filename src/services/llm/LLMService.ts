/**
 * LLM Service - Factory/Manager
 * Creates the appropriate adapter based on provider config,
 * manages conversation history, and provides a unified interface.
 */

import { LLMAdapter, LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProviderInfo } from './types';
import { OpenAIAdapter } from './OpenAIAdapter';
import { ClaudeAdapter } from './ClaudeAdapter';
import { GeminiAdapter } from './GeminiAdapter';

export const LLM_PROVIDERS: LLMProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    models: ['claude-3.5-sonnet', 'claude-3-haiku', 'claude-3-opus'],
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      'openai/gpt-4o',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-pro',
      'meta-llama/llama-3-70b',
      'mistralai/mistral-large',
    ],
  },
];

export class LLMService {
  private adapters: Map<string, LLMAdapter> = new Map();
  private conversationHistory: LLMMessage[] = [];

  constructor() {
    this.adapters.set('openai', new OpenAIAdapter());
    this.adapters.set('anthropic', new ClaudeAdapter());
    this.adapters.set('google', new GeminiAdapter());
    this.adapters.set('openrouter', new OpenAIAdapter());
  }

  getAdapter(provider: string): LLMAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Unknown LLM provider: ${provider}`);
    }
    return adapter;
  }

  getProviders(): LLMProviderInfo[] {
    return LLM_PROVIDERS;
  }

  getModelsForProvider(provider: string): string[] {
    // Use the LLM_PROVIDERS list (not the adapter) for accurate model lists
    const providerInfo = LLM_PROVIDERS.find((p) => p.id === provider);
    if (providerInfo) {
      return providerInfo.models;
    }
    // Fallback to adapter
    const adapter = this.getAdapter(provider);
    return adapter.listModels();
  }

  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  addToHistory(message: LLMMessage): void {
    this.conversationHistory.push(message);
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  setHistory(messages: LLMMessage[]): void {
    this.conversationHistory = [...messages];
  }

  async sendMessage(
    userMessage: string,
    config: LLMConfig,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const adapter = this.getAdapter(config.provider);

    // Build messages array with system prompt and history
    const messages: LLMMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation history
    messages.push(...this.conversationHistory);

    // Add current user message
    const userMsg: LLMMessage = { role: 'user', content: userMessage };
    messages.push(userMsg);

    // Send to adapter
    const response = await adapter.sendMessage(messages, config);

    // Update history
    this.conversationHistory.push(userMsg);
    this.conversationHistory.push({ role: 'assistant', content: response.content });

    return response;
  }

  async streamMessage(
    userMessage: string,
    config: LLMConfig,
    onChunk: (chunk: LLMStreamChunk) => void,
    systemPrompt?: string
  ): Promise<string> {
    const adapter = this.getAdapter(config.provider);

    // Build messages array
    const messages: LLMMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push(...this.conversationHistory);

    const userMsg: LLMMessage = { role: 'user', content: userMessage };
    messages.push(userMsg);

    // Collect the full response
    let fullContent = '';

    await adapter.streamMessage(messages, config, (chunk) => {
      fullContent += chunk.content;
      onChunk(chunk);
    });

    // Update history
    this.conversationHistory.push(userMsg);
    this.conversationHistory.push({ role: 'assistant', content: fullContent });

    return fullContent;
  }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}
