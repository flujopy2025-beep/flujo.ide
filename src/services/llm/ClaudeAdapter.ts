/**
 * Anthropic Claude Messages API Adapter
 * Implements the LLMAdapter interface for Claude models.
 */

import { LLMAdapter, LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk } from './types';

const CLAUDE_MODELS = ['claude-3.5-sonnet', 'claude-3-haiku', 'claude-3-opus'];
const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';

export class ClaudeAdapter implements LLMAdapter {
  async sendMessage(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/v1/messages`;

    // Separate system message from conversation messages
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: config.model,
      messages: conversationMessages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find(
      (block: { type: string }) => block.type === 'text'
    );

    return {
      content: textBlock?.text || '',
      model: data.model,
      finishReason: data.stop_reason,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
    };
  }

  async streamMessage(
    messages: LLMMessage[],
    config: LLMConfig,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/v1/messages`;

    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: config.model,
      messages: conversationMessages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      stream: true,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text || '';
              if (text) {
                onChunk({ content: text, done: false });
              }
            } else if (parsed.type === 'message_stop') {
              onChunk({ content: '', done: true });
              return;
            } else if (parsed.type === 'message_delta') {
              if (parsed.usage) {
                onChunk({
                  content: '',
                  done: true,
                  usage: {
                    promptTokens: 0,
                    completionTokens: parsed.usage.output_tokens || 0,
                    totalTokens: parsed.usage.output_tokens || 0,
                  },
                });
                return;
              }
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onChunk({ content: '', done: true });
  }

  listModels(): string[] {
    return CLAUDE_MODELS;
  }
}
