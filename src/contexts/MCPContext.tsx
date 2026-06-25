/**
 * MCPContext - Manages MCP state including configured servers,
 * connection statuses, available tools/resources, and server management actions.
 */

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import {
  MCPServerConfig,
  MCPConnection,
  MCPTool,
  MCPResource,
  MCPToolResult,
  MCPManager,
} from '../services/mcp';

export interface MCPContextValue {
  /** All configured server connections with their state */
  connections: MCPConnection[];
  /** All tools from connected servers */
  tools: MCPTool[];
  /** All resources from connected servers */
  resources: MCPResource[];
  /** Whether any server is currently connecting */
  isConnecting: boolean;
  /** Add a new MCP server configuration */
  addServer: (config: MCPServerConfig) => Promise<void>;
  /** Update an existing server configuration */
  updateServer: (config: MCPServerConfig) => Promise<void>;
  /** Remove a server configuration */
  removeServer: (serverId: string) => Promise<void>;
  /** Connect to a server */
  connectServer: (serverId: string) => Promise<void>;
  /** Disconnect from a server */
  disconnectServer: (serverId: string) => Promise<void>;
  /** Call a tool on a specific server */
  callTool: (serverId: string, toolName: string, args?: Record<string, unknown>) => Promise<MCPToolResult>;
  /** Find which server has a specific tool and call it */
  callToolByName: (toolName: string, args?: Record<string, unknown>) => Promise<MCPToolResult>;
}

export const MCPContext = createContext<MCPContextValue>({
  connections: [],
  tools: [],
  resources: [],
  isConnecting: false,
  addServer: async () => {},
  updateServer: async () => {},
  removeServer: async () => {},
  connectServer: async () => {},
  disconnectServer: async () => {},
  callTool: async () => ({ content: [] }),
  callToolByName: async () => ({ content: [] }),
});

interface MCPProviderProps {
  children: ReactNode;
}

export function MCPProvider({ children }: MCPProviderProps) {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const managerRef = useRef<MCPManager | null>(null);

  // Initialize the MCP manager
  useEffect(() => {
    const manager = new MCPManager((updatedConnections) => {
      setConnections([...updatedConnections]);
    });
    managerRef.current = manager;

    // Load saved configurations
    const loadConfigs = async () => {
      const configs = await manager.loadConfigs();
      // Initialize connections from configs
      for (const config of configs) {
        setConnections((prev) => {
          if (prev.find((c) => c.serverId === config.id)) return prev;
          return [
            ...prev,
            {
              serverId: config.id,
              config,
              state: 'disconnected',
              tools: [],
              resources: [],
            },
          ];
        });
      }
    };

    loadConfigs();

    return () => {
      manager.disconnectAll();
    };
  }, []);

  const tools = useMemo(() => {
    const allTools: MCPTool[] = [];
    for (const conn of connections) {
      if (conn.state === 'connected') {
        allTools.push(...conn.tools);
      }
    }
    return allTools;
  }, [connections]);

  const resources = useMemo(() => {
    const allResources: MCPResource[] = [];
    for (const conn of connections) {
      if (conn.state === 'connected') {
        allResources.push(...conn.resources);
      }
    }
    return allResources;
  }, [connections]);

  const addServer = useCallback(async (config: MCPServerConfig) => {
    if (managerRef.current) {
      await managerRef.current.addServer(config);
    }
  }, []);

  const updateServer = useCallback(async (config: MCPServerConfig) => {
    if (managerRef.current) {
      await managerRef.current.updateServer(config);
    }
  }, []);

  const removeServer = useCallback(async (serverId: string) => {
    if (managerRef.current) {
      await managerRef.current.removeServer(serverId);
    }
  }, []);

  const connectServer = useCallback(async (serverId: string) => {
    if (managerRef.current) {
      setIsConnecting(true);
      try {
        await managerRef.current.connectServer(serverId);
      } finally {
        setIsConnecting(false);
      }
    }
  }, []);

  const disconnectServer = useCallback(async (serverId: string) => {
    if (managerRef.current) {
      await managerRef.current.disconnectServer(serverId);
    }
  }, []);

  const callTool = useCallback(
    async (serverId: string, toolName: string, args?: Record<string, unknown>): Promise<MCPToolResult> => {
      if (!managerRef.current) {
        throw new Error('MCP Manager not initialized');
      }
      return managerRef.current.callTool(serverId, toolName, args);
    },
    []
  );

  const callToolByName = useCallback(
    async (toolName: string, args?: Record<string, unknown>): Promise<MCPToolResult> => {
      if (!managerRef.current) {
        throw new Error('MCP Manager not initialized');
      }
      const serverId = managerRef.current.findToolServer(toolName);
      if (!serverId) {
        throw new Error(`No connected server provides tool: ${toolName}`);
      }
      return managerRef.current.callTool(serverId, toolName, args);
    },
    []
  );

  const value = useMemo<MCPContextValue>(
    () => ({
      connections,
      tools,
      resources,
      isConnecting,
      addServer,
      updateServer,
      removeServer,
      connectServer,
      disconnectServer,
      callTool,
      callToolByName,
    }),
    [
      connections,
      tools,
      resources,
      isConnecting,
      addServer,
      updateServer,
      removeServer,
      connectServer,
      disconnectServer,
      callTool,
      callToolByName,
    ]
  );

  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>;
}
