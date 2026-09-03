import { z } from 'zod';
import { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';

export type ClientType = 'claude' | 'cursor' | 'chatgpt';

export interface ClientProfile {
  id: ClientType;
  displayName: string;
  clientInfo: {
    name: string;
    version: string;
  };
  capabilities: ClientCapabilities;
  /**
   * Simulates how this specific client's LLM engine prepares and serializes tool arguments.
   */
  transformArguments: (
    toolName: string,
    toolSchema: ToolSchema | undefined,
    idealArguments: Record<string, unknown>
  ) => Record<string, unknown>;

  /**
   * Simulates client-specific validation or quirks during initialization or tool discovery.
   */
  validateToolDefinition?: (tool: ToolDefinition) => { valid: boolean; warning?: string; error?: string };
}

export interface ToolSchema {
  type?: string;
  properties?: Record<string, {
    type?: string;
    description?: string;
    items?: unknown;
    [key: string]: unknown;
  }>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: ToolSchema;
}

// Zod schemas for validating YAML test files
export const ServerConfigSchema = z.object({
  transport: z.enum(['stdio', 'sse']).default('stdio'),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  url: z.string().url().optional(),
}).refine((data) => {
  if (data.transport === 'stdio' && !data.command) {
    return false;
  }
  if (data.transport === 'sse' && !data.url) {
    return false;
  }
  return true;
}, {
  message: "For 'stdio' transport, 'command' is required. For 'sse' transport, 'url' is required.",
});

export const TestCaseSchema = z.object({
  name: z.string(),
  user_message: z.string().optional(),
  expect_tool_call: z.string(),
  expect_arguments: z.record(z.unknown()).default({}),
  expect_result: z.record(z.unknown()).optional(),
  expect_error: z.boolean().optional(),
  skip_clients: z.array(z.enum(['claude', 'cursor', 'chatgpt'])).optional(),
});

export const TestSuiteSchema = z.object({
  name: z.string().default('MCP Test Suite'),
  server: ServerConfigSchema,
  clients: z.array(z.enum(['claude', 'cursor', 'chatgpt'])).default(['claude', 'cursor', 'chatgpt']),
  tests: z.array(TestCaseSchema),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestSuite = z.infer<typeof TestSuiteSchema>;

export interface TestResult {
  testName: string;
  client: ClientType;
  transport: 'stdio' | 'sse';
  passed: boolean;
  durationMs: number;
  error?: string;
  diff?: {
    expected: unknown;
    actual: unknown;
    field?: string;
  };
  details?: {
    toolCalled?: string;
    argumentsSent?: Record<string, unknown>;
    rawResponse?: unknown;
  };
}

export interface SuiteResult {
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}
