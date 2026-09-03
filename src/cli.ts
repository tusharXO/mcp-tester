#!/usr/bin/env node
import { Command } from 'commander';
import { parseTestSuiteFile } from './engine/parser.js';
import { runTestSuite } from './engine/runner.js';
import { printSuiteResult } from './reporter.js';
import { ClientType } from './types.js';

const program = new Command();

program
  .name('mcp-tester')
  .description('Cross-client automated testing framework for Model Context Protocol (MCP) servers')
  .version('0.1.0');

program
  .command('run')
  .description('Run an MCP test specification file against simulated clients')
  .argument('<file>', 'Path to YAML test specification file (e.g. mcp-test.yaml)')
  .option('-c, --client <clients...>', 'Simulate specific client(s): claude, cursor, chatgpt')
  .option('-t, --transport <type>', 'Filter by transport: stdio or sse')
  .option('-v, --verbose', 'Show verbose output including raw responses')
  .option('--json', 'Output results as JSON')
  .action(async (file: string, options: any) => {
    try {
      const parsed = await parseTestSuiteFile(file);

      const filterClients = options.client as ClientType[] | undefined;
      const filterTransport = options.transport as 'stdio' | 'sse' | undefined;

      const suiteResult = await runTestSuite(parsed.suite, {
        baseDir: parsed.baseDir,
        filterClients,
        filterTransport,
        verbose: options.verbose,
      });

      if (options.json) {
        console.log(JSON.stringify(suiteResult, null, 2));
      } else {
        printSuiteResult(suiteResult, options.verbose);
      }

      if (suiteResult.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (err: any) {
      console.error(`\nError: ${err.message}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);
