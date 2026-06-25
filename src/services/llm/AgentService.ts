/**
 * AgentService - Orchestrates the agentic AI loop.
 * Sends messages to the LLM with tools attached, automatically executes
 * tool calls, feeds results back, and loops until the LLM responds
 * with a final text message (or max iterations reached).
 */

import { LLMConfig } from './types';
import { OpenAIAdapter, OpenAIMessage, ToolCallResponse } from './OpenAIAdapter';
import { OpenAIToolDefinition, formatToolsForOpenAI } from './MCPToolIntegration';
import { formatBuiltInToolsForOpenAI, isBuiltInTool, executeBuiltInTool } from './AgentTools';
import { MCPTool, MCPToolResult } from '../mcp/types';

/** Maximum number of tool-call iterations to prevent infinite loops */
const MAX_ITERATIONS = 10;

/** Callback for reporting tool execution progress */
export interface AgentProgressCallback {
  onToolCall: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult: (toolName: string, result: string, isError: boolean) => void;
}

/** Result of an agent interaction */
export interface AgentResult {
  /** Final text response from the AI */
  content: string;
  /** Model that generated the response */
  model: string;
  /** Total number of tool-call iterations executed */
  iterations: number;
}

/**
 * Run the agent loop: send messages with tools, execute tool calls,
 * and repeat until the AI responds with plain text.
 */
export async function runAgentLoop(options: {
  userMessage: string;
  systemPrompt: string;
  config: LLMConfig;
  conversationHistory: OpenAIMessage[];
  mcpTools: MCPTool[];
  callMCPTool: (toolName: string, args?: Record<string, unknown>) => Promise<MCPToolResult>;
  onProgress: AgentProgressCallback;
}): Promise<AgentResult> {
  const {
    userMessage,
    systemPrompt,
    config,
    conversationHistory,
    mcpTools,
    callMCPTool,
    onProgress,
  } = options;

  const adapter = new OpenAIAdapter();

  // Build tool definitions: built-in + MCP tools
  const builtInTools = formatBuiltInToolsForOpenAI();
  const mcpToolDefs = formatToolsForOpenAI(mcpTools);
  const allTools: OpenAIToolDefinition[] = [...builtInTools, ...mcpToolDefs];

  // Build messages array
  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Send to LLM with tools
    const response: ToolCallResponse = await adapter.sendMessageWithTools(
      messages,
      config,
      allTools
    );

    // If no tool calls, we have the final response
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return {
        content: response.content || '',
        model: response.model,
        iterations,
      };
    }

    // The assistant made tool calls - add assistant message to conversation
    const assistantMsg: OpenAIMessage = {
      role: 'assistant',
      content: response.content,
      tool_calls: response.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      })),
    };
    messages.push(assistantMsg);

    // Execute each tool call
    for (const toolCall of response.toolCalls) {
      onProgress.onToolCall(toolCall.name, toolCall.arguments);

      let resultContent: string;
      let isError = false;

      try {
        if (isBuiltInTool(toolCall.name)) {
          // Execute built-in file tool
          resultContent = await executeBuiltInTool(toolCall.name, toolCall.arguments);
        } else {
          // Execute MCP tool
          const mcpResult = await callMCPTool(toolCall.name, toolCall.arguments);
          isError = mcpResult.isError || false;
          resultContent = mcpResult.content
            .map((c) => {
              if (c.type === 'text') return c.text || '';
              if (c.type === 'image') return `[Image: ${c.mimeType || 'image'}]`;
              if (c.type === 'resource') return c.resource?.text || `[Resource: ${c.resource?.uri}]`;
              return '[Unknown content]';
            })
            .join('\n');
        }
      } catch (err) {
        isError = true;
        resultContent = err instanceof Error ? err.message : 'Tool execution failed';
      }

      onProgress.onToolResult(toolCall.name, resultContent, isError);

      // Add tool result message
      const toolResultMsg: OpenAIMessage = {
        role: 'tool',
        content: resultContent,
        tool_call_id: toolCall.id,
      };
      messages.push(toolResultMsg);
    }
  }

  // Max iterations reached - make one final call without tools to get a summary
  const finalResponse = await adapter.sendMessageWithTools(messages, config, []);
  return {
    content: finalResponse.content || 'I reached the maximum number of tool-call iterations. Here is what I accomplished so far based on the actions above.',
    model: finalResponse.model,
    iterations,
  };
}
