import { describe, it, expect } from 'vitest';
import { runTestSuite } from '../src/engine/runner.js';
import { TestSuite } from '../src/types.js';

describe('Test Engine Runner', () => {
  const sampleSuite: TestSuite = {
    name: 'Runner Integration Suite',
    server: {
      transport: 'stdio',
      command: 'node',
      args: ['./node_modules/tsx/dist/cli.mjs', './examples/dummy-server.ts'],
      cwd: process.cwd(),
    },
    clients: ['claude', 'cursor', 'chatgpt'],
    tests: [
      {
        name: 'Lookup order 4521',
        expect_tool_call: 'lookup_order',
        expect_arguments: {
          order_id: 4521,
        },
        expect_result: {
          status: 'shipped',
        },
      },
    ],
  };

  it('correctly reports pass for Claude and Cursor, and failure for ChatGPT', async () => {
    const result = await runTestSuite(sampleSuite);

    expect(result.suiteName).toBe('Runner Integration Suite');
    expect(result.total).toBe(3);

    const claudeResult = result.results.find(r => r.client === 'claude');
    const cursorResult = result.results.find(r => r.client === 'cursor');
    const chatgptResult = result.results.find(r => r.client === 'chatgpt');

    expect(claudeResult).toBeDefined();
    expect(claudeResult?.passed).toBe(true);

    expect(cursorResult).toBeDefined();
    expect(cursorResult?.passed).toBe(true);

    expect(chatgptResult).toBeDefined();
    expect(chatgptResult?.passed).toBe(false);
    expect(chatgptResult?.error).toContain("[OrderLookup Error]: 'order_id' must be an integer");
  }, 15000);

  it('supports client filtering', async () => {
    const result = await runTestSuite(sampleSuite, {
      filterClients: ['claude'],
    });

    expect(result.total).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0].client).toBe('claude');
  }, 10000);
});
