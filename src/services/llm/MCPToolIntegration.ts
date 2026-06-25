/**
 * MCPToolIntegration - Bridges MCP tools with LLM function calling.
 * Formats available MCP tools as function/tool definitions for OpenAI/Claude/Gemini,
 * handles tool call responses from LLM and routes them to the appropriate MCP server,
 * and returns results back to the conversation.
 */

import { MCPTool, MCPToolResult } from '../mcp';

/** OpenAI function calling format */
export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/** Claude tool definition format */
export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Gemini function declaration format */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** A tool call from an LLM response */
export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Result of executing a tool call */
export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  result: string;
  isError: boolean;
}

/**
 * Format MCP tools as OpenAI function calling tool definitions.
 */
export function formatToolsForOpenAI(tools: MCPTool[]): OpenAIToolDefinition[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      parameters: {
        type: 'object' as const,
        properties: tool.inputSchema.properties || {},
        required: tool.inputSchema.required,
      },
    },
  }));
}

/**
 * Format MCP tools as Claude/Anthropic tool definitions.
 */
export function formatToolsForClaude(tools: MCPTool[]): ClaudeToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description || `Tool: ${tool.name}`,
    input_schema: {
      type: 'object' as const,
      properties: tool.inputSchema.properties || {},
      required: tool.inputSchema.required,
    },
  }));
}

/**
 * Format MCP tools as Gemini function declarations.
 */
export function formatToolsForGemini(tools: MCPTool[]): GeminiFunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description || `Tool: ${tool.name}`,
    parameters: {
      type: 'object' as const,
      properties: tool.inputSchema.properties || {},
      required: tool.inputSchema.required,
    },
  }));
}

/**
 * Format MCP tools for a specific provider.
 */
export function formatToolsForProvider(
  tools: MCPTool[],
  provider: 'openai' | 'anthropic' | 'google'
): OpenAIToolDefinition[] | ClaudeToolDefinition[] | GeminiFunctionDeclaration[] {
  switch (provider) {
    case 'openai':
      return formatToolsForOpenAI(tools);
    case 'anthropic':
      return formatToolsForClaude(tools);
    case 'google':
      return formatToolsForGemini(tools);
  }
}

/**
 * Format a tool result as text content for LLM consumption.
 */
export function formatToolResultForLLM(result: MCPToolResult): string {
  if (result.isError) {
    const errorContent = result.content
      .map((c) => c.text || '[non-text content]')
      .join('\n');
    return `Error: ${errorContent}`;
  }

  return result.content
    .map((content) => {
      switch (content.type) {
        case 'text':
          return content.text || '';
        case 'image':
          return `[Image: ${content.mimeType || 'image'}]`;
        case 'resource':
          return content.resource?.text || `[Resource: ${content.resource?.uri}]`;
        default:
          return '[Unknown content type]';
      }
    })
    .join('\n');
}

/**
 * Execute tool calls using the provided callTool function.
 * Returns results formatted for sending back to the LLM.
 */
export async function executeToolCalls(
  toolCalls: LLMToolCall[],
  callToolByName: (toolName: string, args?: Record<string, unknown>) => Promise<MCPToolResult>
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];

  for (const toolCall of toolCalls) {
    try {
      const result = await callToolByName(toolCall.name, toolCall.arguments);
      results.push({
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        result: formatToolResultForLLM(result),
        isError: result.isError || false,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Tool execution failed';
      results.push({
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        result: `Error: ${errorMsg}`,
        isError: true,
      });
    }
  }

  return results;
}
