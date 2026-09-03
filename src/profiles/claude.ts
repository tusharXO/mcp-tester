import { ClientProfile, ToolDefinition, ToolSchema } from '../types.js';

export const claudeProfile: ClientProfile = {
  id: 'claude',
  displayName: 'Claude Desktop',
  clientInfo: {
    name: 'claude-desktop',
    version: '0.8.2',
  },
  capabilities: {
    roots: {
      listChanged: true,
    },
    sampling: {},
  },
  transformArguments: (
    _toolName: string,
    toolSchema: ToolSchema | undefined,
    idealArguments: Record<string, unknown>
  ): Record<string, unknown> => {
    // Claude follows JSON Schema strictly and preserves native types (numbers, objects, booleans).
    // If the schema requires specific types, Claude provides them faithfully.
    const result: Record<string, unknown> = {};
    const properties = toolSchema?.properties || {};

    for (const [key, val] of Object.entries(idealArguments)) {
      const propDef = properties[key];
      if (propDef && propDef.type === 'integer' && typeof val === 'string') {
        const parsed = parseInt(val, 10);
        result[key] = isNaN(parsed) ? val : parsed;
      } else if (propDef && propDef.type === 'number' && typeof val === 'string') {
        const parsed = parseFloat(val);
        result[key] = isNaN(parsed) ? val : parsed;
      } else {
        result[key] = val;
      }
    }

    return result;
  },
  validateToolDefinition: (tool: ToolDefinition) => {
    if (!tool.description || tool.description.trim() === '') {
      return {
        valid: false,
        warning: `Claude may struggle to trigger tool '${tool.name}' because it lacks a description.`,
      };
    }
    return { valid: true };
  },
};
