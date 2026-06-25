/**
 * MCPClient - MCP protocol client for SSE (Server-Sent Events) transport.
 * Implements the MCP JSON-RPC protocol for connecting to MCP servers on mobile.
 * Since stdio is not available on mobile, this uses HTTP+SSE transport.
 */

import {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPToolResult,
  MCPResourceContent,
  MCPConnectionState,
  MCPInitializeResult,
  JSONRPCRequest,
  JSONRPCResponse,
} from './types';

const MCP_PROTOCOL_VERSION = '2024-11-05';

export class MCPClient {
  private config: MCPServerConfig;
  private state: MCPConnectionState = 'disconnected';
  private messageEndpoint: string | null = null;
  private abortController: AbortController | null = null;
  private requestId = 0;
  private pendingRequests: Map<
    number | string,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
  > = new Map();
  private error: string | null = null;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];
  private onStateChange?: (state: MCPConnectionState, error?: string) => void;

  constructor(
    config: MCPServerConfig,
    onStateChange?: (state: MCPConnectionState, error?: string) => void
  ) {
    this.config = config;
    this.onStateChange = onStateChange;
  }

  getState(): MCPConnectionState {
    return this.state;
  }

  getError(): string | null {
    return this.error;
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  getResources(): MCPResource[] {
    return this.resources;
  }

  private setState(state: MCPConnectionState, error?: string): void {
    this.state = state;
    this.error = error || null;
    this.onStateChange?.(state, error);
  }

  private nextId(): number {
    return ++this.requestId;
  }

  /**
   * Connect to the MCP server via SSE transport.
   * 1. Opens an SSE connection to the server's /sse endpoint
   * 2. Receives the message endpoint URL from the server
   * 3. Sends initialize request
   * 4. Sends initialized notification
   * 5. Lists tools and resources
   */
  async connect(): Promise<void> {
    if (!this.config.url) {
      this.setState('error', 'No URL configured for SSE transport');
      throw new Error('No URL configured for SSE transport');
    }

    // Abort any existing connection before starting a new one
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.setState('connecting');

    try {
      // For SSE transport, we establish an EventSource connection
      // and receive the message endpoint from the server
      await this.establishSSEConnection();

      // Send initialize request
      await this.initialize();

      // Send initialized notification
      await this.sendNotification('notifications/initialized', {});

      // Discover tools and resources
      await this.discoverCapabilities();

      this.setState('connected');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      this.setState('error', errorMsg);
      throw err;
    }
  }

  /**
   * Establish SSE connection to the server.
   * The server sends an 'endpoint' event with the URL to POST messages to.
   */
  private async establishSSEConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const sseUrl = this.config.url!;
      const timeout = setTimeout(() => {
        reject(new Error('SSE connection timeout'));
      }, 30000);

      try {
        // In React Native, EventSource may not be available natively.
        // We use a polling-based approach or fetch-based SSE reader.
        this.connectSSE(sseUrl, resolve, reject, timeout);
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  /**
   * Connect to SSE using fetch-based streaming.
   * React Native does not have native EventSource, so we use fetch with streaming.
   */
  private connectSSE(
    url: string,
    resolve: () => void,
    reject: (err: Error) => void,
    timeout: ReturnType<typeof setTimeout>
  ): void {
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...this.config.headers,
    };

    fetch(url, { headers, method: 'GET', signal: this.abortController?.signal })
      .then(async (response) => {
        if (!response.ok) {
          clearTimeout(timeout);
          reject(new Error(`SSE connection failed: ${response.status} ${response.statusText}`));
          return;
        }

        if (!response.body) {
          clearTimeout(timeout);
          reject(new Error('No response body for SSE stream'));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let endpointReceived = false;

        const processStream = async (): Promise<void> => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              let eventType = '';
              let eventData = '';

              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventType = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                  eventData = line.slice(6).trim();
                } else if (line === '' && eventData) {
                  // End of event
                  this.handleSSEEvent(eventType, eventData);

                  if (eventType === 'endpoint' && !endpointReceived) {
                    // The endpoint event contains the URL to POST messages to
                    this.messageEndpoint = this.resolveEndpointUrl(eventData);
                    endpointReceived = true;
                    clearTimeout(timeout);
                    resolve();
                  }

                  eventType = '';
                  eventData = '';
                }
              }
            }
          } catch (err) {
            if (this.state === 'connected' || this.state === 'connecting') {
              // Ignore AbortError since it is triggered intentionally on disconnect
              if (err instanceof Error && err.name === 'AbortError') {
                return;
              }
              const errorMsg = err instanceof Error ? err.message : 'SSE stream error';
              this.setState('error', errorMsg);
            }
          }
        };

        // Process stream in background
        processStream();
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error('SSE connection failed'));
      });
  }

  /**
   * Resolve the endpoint URL relative to the server URL if needed.
   */
  private resolveEndpointUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    // Resolve relative to the server URL
    const baseUrl = new URL(this.config.url!);
    return new URL(endpoint, baseUrl.origin).toString();
  }

  /**
   * Handle incoming SSE events from the server.
   */
  private handleSSEEvent(eventType: string, data: string): void {
    if (eventType === 'message') {
      try {
        const response: JSONRPCResponse = JSON.parse(data);
        this.handleResponse(response);
      } catch {
        // Invalid JSON, ignore
      }
    }
  }

  /**
   * Handle a JSON-RPC response from the server.
   */
  private handleResponse(response: JSONRPCResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      if (response.error) {
        pending.reject(new Error(`MCP Error: ${response.error.message} (${response.error.code})`));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  /**
   * Send a JSON-RPC request to the server via HTTP POST.
   */
  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.messageEndpoint) {
      throw new Error('Not connected - no message endpoint available');
    }

    const id = this.nextId();
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.headers,
      };

      fetch(this.messageEndpoint!, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }).catch((err) => {
        this.pendingRequests.delete(id);
        reject(err instanceof Error ? err : new Error('Request failed'));
      });

      // Timeout for response
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected).
   */
  private async sendNotification(
    method: string,
    params?: Record<string, unknown>
  ): Promise<void> {
    if (!this.messageEndpoint) {
      throw new Error('Not connected - no message endpoint available');
    }

    const notification = {
      jsonrpc: '2.0' as const,
      method,
      params,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    await fetch(this.messageEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(notification),
    });
  }

  /**
   * Send MCP initialize request.
   */
  private async initialize(): Promise<MCPInitializeResult> {
    const result = (await this.sendRequest('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        roots: { listChanged: true },
      },
      clientInfo: {
        name: 'Flujo IDE',
        version: '1.0.0',
      },
    })) as MCPInitializeResult;

    return result;
  }

  /**
   * Discover server capabilities (tools and resources).
   */
  private async discoverCapabilities(): Promise<void> {
    try {
      const toolsResult = await this.listTools();
      this.tools = toolsResult;
    } catch {
      // Server may not support tools
      this.tools = [];
    }

    try {
      const resourcesResult = await this.listResources();
      this.resources = resourcesResult;
    } catch {
      // Server may not support resources
      this.resources = [];
    }
  }

  /**
   * List all tools available on the server.
   */
  async listTools(): Promise<MCPTool[]> {
    const result = (await this.sendRequest('tools/list', {})) as {
      tools: Array<{ name: string; description?: string; inputSchema: MCPTool['inputSchema'] }>;
    };

    return (result.tools || []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      serverId: this.config.id,
    }));
  }

  /**
   * List all resources available on the server.
   */
  async listResources(): Promise<MCPResource[]> {
    const result = (await this.sendRequest('resources/list', {})) as {
      resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }>;
    };

    return (result.resources || []).map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
      serverId: this.config.id,
    }));
  }

  /**
   * Call a tool on the server.
   */
  async callTool(toolName: string, args?: Record<string, unknown>): Promise<MCPToolResult> {
    const result = (await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args || {},
    })) as MCPToolResult;

    return result;
  }

  /**
   * Read a resource from the server.
   */
  async readResource(uri: string): Promise<MCPResourceContent> {
    const result = (await this.sendRequest('resources/read', {
      uri,
    })) as { contents: MCPResourceContent[] };

    if (result.contents && result.contents.length > 0) {
      return result.contents[0];
    }

    return { uri, text: '' };
  }

  /**
   * Disconnect from the MCP server.
   */
  async disconnect(): Promise<void> {
    // Cancel all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Client disconnected'));
      this.pendingRequests.delete(id);
    }

    // Abort the SSE fetch stream
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.messageEndpoint = null;
    this.tools = [];
    this.resources = [];
    this.setState('disconnected');
  }
}
