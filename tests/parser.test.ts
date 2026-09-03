import { describe, it, expect } from 'vitest';
import { parseTestSuiteFile } from '../src/engine/parser.js';
import path from 'node:path';

describe('YAML Test Suite Parser', () => {
  it('parses a valid stdio test suite file', async () => {
    const filePath = path.resolve('examples/order-test.yaml');
    const { suite, baseDir } = await parseTestSuiteFile(filePath);

    expect(suite.name).toBe('OrderLookup MCP Server Test Suite');
    expect(suite.server.transport).toBe('stdio');
    expect(suite.server.command).toBe('node');
    expect(suite.clients).toEqual(['claude', 'cursor', 'chatgpt', 'antigravity']);
    expect(suite.tests.length).toBe(2);
    expect(suite.tests[0].expect_tool_call).toBe('lookup_order');
    expect(baseDir).toBeDefined();
  });

  it('parses a valid sse test suite file', async () => {
    const filePath = path.resolve('examples/sse-test.yaml');
    const { suite } = await parseTestSuiteFile(filePath);

    expect(suite.server.transport).toBe('sse');
    expect(suite.server.url).toBe('http://localhost:3888/sse');
    expect(suite.tests[0].expect_tool_call).toBe('lookup_order');
  });

  it('throws a descriptive error on non-existent file', async () => {
    await expect(parseTestSuiteFile('non-existent.yaml')).rejects.toThrow(
      /Failed to read test specification file/
    );
  });
});
