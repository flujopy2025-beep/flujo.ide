/**
 * Core TypeScript interfaces for Flujo IDE
 */

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
  language?: string;
  lastModified?: number;
}

export interface Tab {
  id: string;
  fileId: string;
  fileName: string;
  filePath: string;
  language: string;
  isActive: boolean;
  isDirty: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  provider?: string;
  model?: string;
  /** Tool calls made by the assistant */
  toolCalls?: ToolCallInfo[];
  /** Tool call result metadata (for role: 'tool') */
  toolResult?: ToolResultInfo;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultInfo {
  toolCallId: string;
  toolName: string;
  isError: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'openrouter';
  apiKey: string;
  baseUrl?: string;
  model: string;
  isActive: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  isConnected: boolean;
  capabilities?: string[];
  config?: Record<string, unknown>;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  llmProviders: LLMProvider[];
  mcpServers: MCPServer[];
  activeProviderId?: string;
  googleClientId?: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  border: string;
  borderLight: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  tabBar: string;
  tabBarInactive: string;
  tabBarActive: string;
  statusBar: string;
  editorBackground: string;
  editorLineHighlight: string;
  editorGutter: string;
}

export interface Theme {
  mode: 'dark' | 'light';
  colors: ThemeColors;
}
