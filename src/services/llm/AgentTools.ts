/**
 * AgentTools - Built-in tools that the AI agent can use to interact
 * with the user's workspace files. These complement MCP tools.
 */

import { FileService } from '../FileService';
import { OpenAIToolDefinition } from './MCPToolIntegration';

export interface BuiltInToolDef {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

/**
 * Built-in tools available to the AI agent for file operations.
 */
export const BUILT_IN_TOOLS: BuiltInToolDef[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file from the workspace',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (creates or overwrites)',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path' },
        content: { type: 'string', description: 'File content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories in the workspace',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative directory path (empty for root)' },
      },
    },
  },
  {
    name: 'create_file',
    description: 'Create a new file with content',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path for new file' },
        content: { type: 'string', description: 'Initial content' },
      },
      required: ['path'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file or directory',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to delete' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for text in files across the workspace',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search for' },
        path: { type: 'string', description: 'Directory to search in (empty for all)' },
      },
      required: ['query'],
    },
  },
];

/**
 * Format built-in tools as OpenAI function calling tool definitions.
 */
export function formatBuiltInToolsForOpenAI(): OpenAIToolDefinition[] {
  return BUILT_IN_TOOLS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object' as const,
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    },
  }));
}

/**
 * Check if a tool name is a built-in tool.
 */
export function isBuiltInTool(name: string): boolean {
  return BUILT_IN_TOOLS.some((t) => t.name === name);
}

/**
 * Execute a built-in tool by name with the given arguments.
 * Returns a string result or throws on error.
 */
export async function executeBuiltInTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'read_file': {
      const path = args.path as string;
      if (!path) throw new Error('read_file requires a path argument');
      const content = await FileService.readFile(path);
      return content;
    }

    case 'write_file': {
      const path = args.path as string;
      const content = args.content as string;
      if (!path) throw new Error('write_file requires a path argument');
      if (content === undefined || content === null) {
        throw new Error('write_file requires a content argument');
      }
      await FileService.writeFile(path, content);
      return `Successfully wrote to ${path}`;
    }

    case 'list_files': {
      const path = (args.path as string) || '';
      const nodes = await FileService.listDirectory(path);
      const formatNode = (node: { name: string; type: string; children?: unknown[] }, indent: string): string => {
        const prefix = node.type === 'directory' ? '/' : '';
        return `${indent}${node.name}${prefix}`;
      };
      const formatTree = (
        nodes: Array<{ name: string; type: string; children?: Array<{ name: string; type: string; children?: unknown[] }> }>,
        indent: string = ''
      ): string => {
        return nodes
          .map((node) => {
            const line = formatNode(node, indent);
            if (node.type === 'directory' && node.children && node.children.length > 0) {
              return line + '\n' + formatTree(
                node.children as Array<{ name: string; type: string; children?: Array<{ name: string; type: string; children?: unknown[] }> }>,
                indent + '  '
              );
            }
            return line;
          })
          .join('\n');
      };
      const tree = formatTree(nodes);
      return tree || '(empty directory)';
    }

    case 'create_file': {
      const path = args.path as string;
      const content = (args.content as string) || '';
      if (!path) throw new Error('create_file requires a path argument');
      await FileService.createFile(path, content);
      return `Successfully created ${path}`;
    }

    case 'delete_file': {
      const path = args.path as string;
      if (!path) throw new Error('delete_file requires a path argument');
      await FileService.deleteFile(path);
      return `Successfully deleted ${path}`;
    }

    case 'search_files': {
      const query = args.query as string;
      const searchPath = (args.path as string) || '';
      if (!query) throw new Error('search_files requires a query argument');
      const results = await searchInFiles(query, searchPath);
      return results || 'No matches found';
    }

    default:
      throw new Error(`Unknown built-in tool: ${name}`);
  }
}

/**
 * Search for text in files within the workspace.
 * Recursively reads files and checks for the query string.
 */
async function searchInFiles(query: string, basePath: string): Promise<string> {
  const nodes = await FileService.listDirectory(basePath);
  const matches: string[] = [];
  const maxResults = 20;

  async function searchNode(
    node: { name: string; path: string; type: string; children?: Array<{ name: string; path: string; type: string; children?: unknown[] }> }
  ): Promise<void> {
    if (matches.length >= maxResults) return;

    if (node.type === 'file') {
      // Skip binary-looking files
      const ext = node.name.split('.').pop()?.toLowerCase() || '';
      const textExtensions = [
        'ts', 'tsx', 'js', 'jsx', 'json', 'md', 'txt', 'css', 'html',
        'xml', 'yaml', 'yml', 'toml', 'cfg', 'conf', 'sh', 'py', 'rb',
        'java', 'kt', 'swift', 'c', 'cpp', 'h', 'rs', 'go', 'dart',
      ];
      if (!textExtensions.includes(ext)) return;

      try {
        const content = await FileService.readFile(node.path);
        const lines = content.split('\n');
        const queryLower = query.toLowerCase();

        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= maxResults) break;
          if (lines[i].toLowerCase().includes(queryLower)) {
            matches.push(`${node.path}:${i + 1}: ${lines[i].trim()}`);
          }
        }
      } catch {
        // Skip files that cannot be read
      }
    } else if (node.type === 'directory' && node.children) {
      for (const child of node.children) {
        if (matches.length >= maxResults) break;
        await searchNode(
          child as { name: string; path: string; type: string; children?: Array<{ name: string; path: string; type: string; children?: unknown[] }> }
        );
      }
    }
  }

  for (const node of nodes) {
    if (matches.length >= maxResults) break;
    await searchNode(
      node as { name: string; path: string; type: string; children?: Array<{ name: string; path: string; type: string; children?: unknown[] }> }
    );
  }

  if (matches.length >= maxResults) {
    return matches.join('\n') + `\n... (showing first ${maxResults} results)`;
  }

  return matches.join('\n');
}
