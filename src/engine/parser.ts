import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { TestSuite, TestSuiteSchema } from '../types.js';

export interface ParsedSuite {
  suite: TestSuite;
  filePath: string;
  baseDir: string;
}

export async function parseTestSuiteFile(filePath: string): Promise<ParsedSuite> {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  let content: string;

  try {
    content = await fs.readFile(resolvedPath, 'utf-8');
  } catch (err: any) {
    throw new Error(`Failed to read test specification file at '${filePath}': ${err.message}`);
  }

  let rawYaml: unknown;
  try {
    rawYaml = parseYaml(content);
  } catch (err: any) {
    throw new Error(`Invalid YAML format in '${filePath}': ${err.message}`);
  }

  const parseResult = TestSuiteSchema.safeParse(rawYaml);
  if (!parseResult.success) {
    const formattedErrors = parseResult.error.errors
      .map(e => `  - [${e.path.join('.')}] ${e.message}`)
      .join('\n');
    throw new Error(`Invalid test specification schema in '${filePath}':\n${formattedErrors}`);
  }

  const baseDir = path.dirname(resolvedPath);
  const suite = parseResult.data;

  // If server command has relative path or args with relative paths, adjust cwd if not provided
  if (suite.server.transport === 'stdio') {
    if (!suite.server.cwd) {
      suite.server.cwd = process.cwd();
    }
  }

  return {
    suite,
    filePath: resolvedPath,
    baseDir,
  };
}
