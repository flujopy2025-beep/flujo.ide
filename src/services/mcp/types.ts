/**
 * MCP (Model Context Protocol) Types
 * Defines interfaces for MCP server configuration, connections, tools, and resources.
 */

/** Transport type for connecting to MCP servers */
export type MCPTransportType = 'sse' | 'stdio';

/** Connection state for an MCP server */
export type MCPConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Configuration for an MCP server */
export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransportType;
  /** URL for SSE transport */
  url?: string;
  /** Command for stdio transport (not available on mobile, stored for reference) */
  command?: string;
  /** Command arguments for stdio transport */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** HTTP headers for SSE transport */
  headers?: Record<string, string>;
  /** Description of what this server provides */
  description?: string;
  /** Whether to auto-connect on app start */
  autoConnect?: boolean;
}

/** An MCP tool definition */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: MCPToolInputSchema;
  /** Which server this tool belongs to */
  serverId: string;
}

/** JSON Schema for tool input */
export interface MCPToolInputSchema {
  type: 'object';
  properties?: Record<string, MCPSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/** A property in a JSON Schema */
export interface MCPSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: MCPSchemaProperty;
  properties?: Record<string, MCPSchemaProperty>;
  required?: string[];
  default?: unknown;
}

/** An MCP resource definition */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  /** Which server this resource belongs to */
  serverId: string;
}

/** Represents the connection state and metadata for an MCP server */
export interface MCPConnection {
  serverId: string;
  config: MCPServerConfig;
  state: MCPConnectionState;
  error?: string;
  tools: MCPTool[];
  resources: MCPResource[];
  lastConnected?: number;
}

/** JSON-RPC request message */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC response message */
export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: JSONRPCError;
}

/** JSON-RPC error object */
export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

/** JSON-RPC notification (no id) */
export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

/** MCP tool call result */
export interface MCPToolResult {
  content: MCPToolResultContent[];
  isError?: boolean;
}

/** Content item in a tool result */
export interface MCPToolResultContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  };
}

/** MCP resource content */
export interface MCPResourceContent {
  uri: string;
  text?: string;
  blob?: string;
  mimeType?: string;
}

/** MCP initialize result */
export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

/** Server capabilities returned from initialize */
export interface MCPServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, unknown>;
}
