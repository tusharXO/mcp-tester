import { ClientProfile, ToolDefinition, ToolSchema } from '../types.js';

export const cursorProfile: ClientProfile = {
  id: 'cursor',
  displayName: 'Cursor IDE',
  clientInfo: {
    name: 'cursor',
    version: '0.45.1',
  },
  capabilities: {
    roots: {
      listChanged: false,
    },
  },
  transformArguments: (
    _toolName: string,
    _toolSchema: ToolSchema | undefined,
    idealArguments: Record<string, unknown>
  ): Record<string, unknown> => {
    // Cursor strictly serializes arguments, stripping null and undefined keys
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(idealArguments)) {
      if (val !== undefined && val !== null) {
        result[key] = val;
      }
    }
    return result;
  },
  validateToolDefinition: (tool: ToolDefinition) => {
    // Cursor requires inputSchema to be an object with properties or type 'object'.
    // If not, Cursor's tool indexing silently fails to show the tool to the assistant.
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      return {
        valid: false,
        error: `Cursor will fail to index '${tool.name}': inputSchema is missing or not an object.`,
      };
    }

    if (tool.inputSchema.type && tool.inputSchema.type !== 'object') {
      return {
        valid: false,
        error: `Cursor requires top-level schema type 'object', but '${tool.name}' specifies '${tool.inputSchema.type}'. Tool will be silently ignored.`,
      };
    }

    return { valid: true };
  },
};
