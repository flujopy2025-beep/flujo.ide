/**
 * OpenAI Chat Completions API Adapter
 * Implements the LLMAdapter interface for OpenAI models.
 * Also supports tool/function calling via sendMessageWithTools.
 */

import { LLMAdapter, LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk } from './types';

/** OpenAI function calling tool definition format */
export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Response from a tool-enabled API call */
export interface ToolCallResponse {
  content: string | null;
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | null;
  model: string;
  finishReason: string;
}

/** Message format for OpenAI API with tool support */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIAdapter implements LLMAdapter {
  async sendMessage(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    // Build headers - add OpenRouter-specific headers when using their API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
    if (baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://github.com/flujopy2025-beep/flujo.ide';
      headers['X-Title'] = 'Flujo IDE';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error (${response.status}) [${baseUrl}]: ${errorBody}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      model: data.model,
      finishReason: choice?.finish_reason,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
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
    const url = `${baseUrl}/chat/completions`;

    // Build headers - add OpenRouter-specific headers when using their API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
    if (baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://github.com/flujopy2025-beep/flujo.ide';
      headers['X-Title'] = 'Flujo IDE';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error (${response.status}) [${baseUrl}]: ${errorBody}`);
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
          if (data === '[DONE]') {
            onChunk({ content: '', done: true });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            const content = delta?.content || '';
            const finishReason = parsed.choices?.[0]?.finish_reason;

            if (content || finishReason === 'stop') {
              onChunk({
                content,
                done: finishReason === 'stop',
              });
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

  /**
   * Send a message with tools attached for function calling.
   * Returns both content and any tool calls the model wants to make.
   */
  async sendMessageWithTools(
    messages: OpenAIMessage[],
    config: LLMConfig,
    tools: OpenAIToolDefinition[]
  ): Promise<ToolCallResponse> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
    if (baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://github.com/flujopy2025-beep/flujo.ide';
      headers['X-Title'] = 'Flujo IDE';
    }

    const body: Record<string, unknown> = {
      model: config.model,
      messages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
    };

    // Only include tools if there are any
    if (tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error (${response.status}) [${baseUrl}]: ${errorBody}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    // Parse tool calls if present
    let toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | null = null;
    if (message?.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map(
        (tc: { id: string; type: string; function: { name: string; arguments: string } }) => {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch {
            // If arguments are not valid JSON, store as raw string
            parsedArgs = { _raw: tc.function.arguments };
          }
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: parsedArgs,
          };
        }
      );
    }

    return {
      content: message?.content || null,
      toolCalls,
      model: data.model || config.model,
      finishReason: choice?.finish_reason || 'stop',
    };
  }

  listModels(): string[] {
    return OPENAI_MODELS;
  }
}
