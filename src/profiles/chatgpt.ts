import { ClientProfile, ToolDefinition, ToolSchema } from '../types.js';

export const chatgptProfile: ClientProfile = {
  id: 'chatgpt',
  displayName: 'ChatGPT (Web / Apps)',
  clientInfo: {
    name: 'chatgpt-client',
    version: '1.2024.1',
  },
  capabilities: {
    experimental: {
      streamingTools: {},
    },
  },
  transformArguments: (
    _toolName: string,
    toolSchema: ToolSchema | undefined,
    idealArguments: Record<string, unknown>
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    const properties = toolSchema?.properties || {};

    for (const [key, val] of Object.entries(idealArguments)) {
      const propDef = properties[key];

      // Quirk 1: String vs Numeric scalar casting.
      // Often when an ID is requested (like order_id, user_id), ChatGPT provides it as a string even if typed integer/number.
      if (
        propDef &&
        (propDef.type === 'integer' || propDef.type === 'number') &&
        (typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(val)))
      ) {
        // If the parameter name looks like an ID or code, ChatGPT commonly passes it as a string
        if (key.toLowerCase().includes('id') || key.toLowerCase().includes('code') || key.toLowerCase().includes('num')) {
          result[key] = String(val);
        } else {
          result[key] = val;
        }
      }
      // Quirk 2: Nested objects stringified.
      // In ChatGPT function calling pipelines, nested objects are sometimes delivered as JSON stringified strings
      else if (
        propDef &&
        propDef.type === 'object' &&
        typeof val === 'object' &&
        val !== null &&
        !Array.isArray(val)
      ) {
        // Only stringify if specifically tagged or as a simulation option
        result[key] = val;
      }
      // Quirk 3: String typed parameter with integer value
      else if (propDef && propDef.type === 'string' && typeof val === 'number') {
        result[key] = String(val);
      }
      else {
        result[key] = val;
      }
    }

    return result;
  },
  validateToolDefinition: (tool: ToolDefinition) => {
    // ChatGPT requires all properties in strict mode to have descriptions
    if (tool.inputSchema?.properties) {
      for (const [propName, prop] of Object.entries(tool.inputSchema.properties)) {
        if (!prop.description) {
          return {
            valid: true,
            warning: `ChatGPT parameter '${tool.name}.${propName}' has no description; model may guess parameter meaning or omit it.`,
          };
        }
      }
    }
    return { valid: true };
  },
};
