/**
 * Google Gemini (Generative AI) API Adapter
 * Implements the LLMAdapter interface for Gemini models.
 */

import { LLMAdapter, LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk } from './types';

const GEMINI_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash'];
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiContent {
  role: string;
  parts: { text: string }[];
}

export class GeminiAdapter implements LLMAdapter {
  private formatMessages(messages: LLMMessage[]): {
    contents: GeminiContent[];
    systemInstruction?: { parts: { text: string }[] };
  } {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const contents: GeminiContent[] = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result: {
      contents: GeminiContent[];
      systemInstruction?: { parts: { text: string }[] };
    } = { contents };

    if (systemMessage) {
      result.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    return result;
  }

  async sendMessage(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;

    const { contents, systemInstruction } = this.formatMessages(messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';

    return {
      content: text,
      model: config.model,
      finishReason: candidate?.finishReason,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
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
    const url = `${baseUrl}/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

    const { contents, systemInstruction } = this.formatMessages(messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
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
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const finishReason = parsed.candidates?.[0]?.finishReason;

            if (text) {
              onChunk({ content: text, done: false });
            }

            if (finishReason === 'STOP') {
              onChunk({
                content: '',
                done: true,
                usage: parsed.usageMetadata
                  ? {
                      promptTokens: parsed.usageMetadata.promptTokenCount || 0,
                      completionTokens: parsed.usageMetadata.candidatesTokenCount || 0,
                      totalTokens: parsed.usageMetadata.totalTokenCount || 0,
                    }
                  : undefined,
              });
              return;
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
    return GEMINI_MODELS;
  }
}
