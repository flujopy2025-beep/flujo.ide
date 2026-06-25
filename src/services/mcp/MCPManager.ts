/**
 * MCPManager - Manages multiple MCP server connections.
 * Stores configurations, handles connections/disconnections,
 * and provides a unified interface to list all available tools/resources.
 */

import { MCPClient } from './MCPClient';
import {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPConnection,
  MCPConnectionState,
  MCPToolResult,
  MCPResourceContent,
} from './types';
import { getStorageService } from '../StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@flujoide/mcp_configs';

export class MCPManager {
  private clients: Map<string, MCPClient> = new Map();
  private connections: Map<string, MCPConnection> = new Map();
  private configs: MCPServerConfig[] = [];
  private onConnectionsChanged?: (connections: MCPConnection[]) => void;

  constructor(onConnectionsChanged?: (connections: MCPConnection[]) => void) {
    this.onConnectionsChanged = onConnectionsChanged;
  }

  /**
   * Load server configurations from storage.
   */
  async loadConfigs(): Promise<MCPServerConfig[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      this.configs = data ? JSON.parse(data) : [];
      return this.configs;
    } catch {
      this.configs = [];
      return [];
    }
  }

  /**
   * Save server configurations to storage.
   */
  async saveConfigs(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.configs));
    } catch {
      // Silently fail
    }
  }

  /**
   * Get all server configurations.
   */
  getConfigs(): MCPServerConfig[] {
    return [...this.configs];
  }

  /**
   * Get all connections with their current state.
   */
  getConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Add a new server configuration.
   */
  async addServer(config: MCPServerConfig): Promise<void> {
    this.configs.push(config);
    this.connections.set(config.id, {
      serverId: config.id,
      config,
      state: 'disconnected',
      tools: [],
      resources: [],
    });
    await this.saveConfigs();
    this.notifyChange();
  }

  /**
   * Update an existing server configuration.
   */
  async updateServer(config: MCPServerConfig): Promise<void> {
    const index = this.configs.findIndex((c) => c.id === config.id);
    if (index >= 0) {
      // Disconnect if connected
      if (this.clients.has(config.id)) {
        await this.disconnectServer(config.id);
      }
      this.configs[index] = config;
      this.connections.set(config.id, {
        serverId: config.id,
        config,
        state: 'disconnected',
        tools: [],
        resources: [],
      });
      await this.saveConfigs();
      this.notifyChange();
    }
  }

  /**
   * Remove a server configuration.
   */
  async removeServer(serverId: string): Promise<void> {
    // Disconnect if connected
    if (this.clients.has(serverId)) {
      await this.disconnectServer(serverId);
    }
    this.configs = this.configs.filter((c) => c.id !== serverId);
    this.connections.delete(serverId);
    this.clients.delete(serverId);
    await this.saveConfigs();
    this.notifyChange();
  }

  /**
   * Connect to a specific server.
   */
  async connectServer(serverId: string): Promise<void> {
    const config = this.configs.find((c) => c.id === serverId);
    if (!config) {
      throw new Error(`Server config not found: ${serverId}`);
    }

    // Update connection state
    this.updateConnectionState(serverId, 'connecting');

    const client = new MCPClient(config, (state, error) => {
      this.updateConnectionState(serverId, state, error);
    });

    this.clients.set(serverId, client);

    try {
      await client.connect();
      // Update connection with discovered tools/resources
      const connection = this.connections.get(serverId);
      if (connection) {
        connection.tools = client.getTools();
        connection.resources = client.getResources();
        connection.lastConnected = Date.now();
        this.notifyChange();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      this.updateConnectionState(serverId, 'error', errorMsg);
      throw err;
    }
  }

  /**
   * Disconnect from a specific server.
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.disconnect();
      this.clients.delete(serverId);
    }
    this.updateConnectionState(serverId, 'disconnected');
  }

  /**
   * Connect to all servers that have autoConnect enabled.
   */
  async connectAutoServers(): Promise<void> {
    const autoConnectServers = this.configs.filter((c) => c.autoConnect);
    for (const config of autoConnectServers) {
      try {
        await this.connectServer(config.id);
      } catch {
        // Continue with other servers even if one fails
      }
    }
  }

  /**
   * Disconnect all servers.
   */
  async disconnectAll(): Promise<void> {
    for (const serverId of this.clients.keys()) {
      await this.disconnectServer(serverId);
    }
  }

  /**
   * Get all tools from all connected servers.
   */
  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const connection of this.connections.values()) {
      if (connection.state === 'connected') {
        tools.push(...connection.tools);
      }
    }
    return tools;
  }

  /**
   * Get all resources from all connected servers.
   */
  getAllResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const connection of this.connections.values()) {
      if (connection.state === 'connected') {
        resources.push(...connection.resources);
      }
    }
    return resources;
  }

  /**
   * Call a tool on a specific server.
   */
  async callTool(
    serverId: string,
    toolName: string,
    args?: Record<string, unknown>
  ): Promise<MCPToolResult> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server not connected: ${serverId}`);
    }
    return client.callTool(toolName, args);
  }

  /**
   * Read a resource from a specific server.
   */
  async readResource(serverId: string, uri: string): Promise<MCPResourceContent> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server not connected: ${serverId}`);
    }
    return client.readResource(uri);
  }

  /**
   * Find which server provides a given tool.
   */
  findToolServer(toolName: string): string | null {
    for (const connection of this.connections.values()) {
      if (connection.state === 'connected') {
        const tool = connection.tools.find((t) => t.name === toolName);
        if (tool) {
          return connection.serverId;
        }
      }
    }
    return null;
  }

  private updateConnectionState(
    serverId: string,
    state: MCPConnectionState,
    error?: string
  ): void {
    const connection = this.connections.get(serverId);
    if (connection) {
      connection.state = state;
      connection.error = error;
      if (state === 'disconnected') {
        connection.tools = [];
        connection.resources = [];
      }
    } else {
      const config = this.configs.find((c) => c.id === serverId);
      if (config) {
        this.connections.set(serverId, {
          serverId,
          config,
          state,
          error,
          tools: [],
          resources: [],
        });
      }
    }
    this.notifyChange();
  }

  private notifyChange(): void {
    this.onConnectionsChanged?.(this.getConnections());
  }
}

// Singleton instance
let mcpManagerInstance: MCPManager | null = null;

export function getMCPManager(
  onConnectionsChanged?: (connections: MCPConnection[]) => void
): MCPManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new MCPManager(onConnectionsChanged);
  }
  return mcpManagerInstance;
}

export function resetMCPManager(): void {
  mcpManagerInstance = null;
}
