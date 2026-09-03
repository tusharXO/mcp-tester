import { ClientProfile, ToolDefinition, ToolSchema } from '../types.js';

export const antigravityProfile: ClientProfile = {
  id: 'antigravity',
  displayName: 'Antigravity IDE',
  clientInfo: {
    name: 'antigravity-ide',
    version: '2.0.0',
  },
  capabilities: {
    roots: {
      listChanged: true,
    },
    sampling: {},
    experimental: {
      toolLazyLoading: {},
      sidecars: {},
    },
  },
  transformArguments: (
    _toolName: string,
    toolSchema: ToolSchema | undefined,
    idealArguments: Record<string, unknown>
  ): Record<string, unknown> => {
    // Antigravity agentic engine respects JSON Schema types and preserves native typing
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
      } else if (val !== undefined && val !== null) {
        result[key] = val;
      }
    }

    return result;
  },
  validateToolDefinition: (tool: ToolDefinition) => {
    // Antigravity agentic routing relies on semantic tool descriptions to route tools to agents
    if (!tool.description || tool.description.trim() === '') {
      return {
        valid: false,
        warning: `Antigravity IDE agent routing requires a meaningful description for '${tool.name}' to accurately index and summon this tool.`,
      };
    }
    return { valid: true };
  },
};
