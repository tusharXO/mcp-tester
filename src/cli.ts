#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import { parseTestSuiteFile } from './engine/parser.js';
import { runTestSuite } from './engine/runner.js';
import { printSuiteResult } from './reporter.js';
import { ClientType } from './types.js';
import { createTransport } from './transports/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { stringify as stringifyYaml } from 'yaml';

const program = new Command();

program
  .name('mcp-cross-test')
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
      console.error(`\n${pc.red('Error:')} ${err.message}\n`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Scaffold an mcp-test.yaml suite by auto-discovering tools from your MCP server')
  .option('-c, --command <cmd>', 'Command to run your MCP server (stdio)')
  .option('-a, --args <args...>', 'Arguments to pass to the command')
  .option('-u, --url <url>', 'URL for SSE MCP server')
  .option('-o, --output <file>', 'Output YAML filename', 'mcp-test.yaml')
  .action(async (options: any) => {
    const outputFile = path.resolve(process.cwd(), options.output);
    console.log(pc.bold(pc.cyan('\n🧪 Initializing MCP Cross-Client Test Suite...\n')));

    let discoveredTests: any[] = [];
    let serverConfig: any = {};

    if (options.url) {
      serverConfig = {
        transport: 'sse',
        url: options.url,
      };
    } else if (options.command) {
      serverConfig = {
        transport: 'stdio',
        command: options.command,
        args: options.args || [],
      };
    } else {
      // Default starter template
      serverConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['./dist/server.js'],
      };
      discoveredTests = [
        {
          name: 'Example: User triggers tool',
          user_message: 'where is my order?',
          expect_tool_call: 'lookup_order',
          expect_arguments: {
            order_id: 1234,
          },
        },
      ];
    }

    // Attempt live tool discovery if command or url provided
    if (options.command || options.url) {
      console.log(`Connecting to server to discover available tools...`);
      let transportHandle;
      try {
        transportHandle = await createTransport(serverConfig);
        const client = new Client({ name: 'mcp-init', version: '1.0.0' }, { capabilities: {} });
        await client.connect(transportHandle.transport);

        const list = await client.listTools();
        console.log(pc.green(`✔ Discovered ${list.tools.length} tool(s) from server!`));

        discoveredTests = list.tools.map((tool) => {
          const sampleArgs: Record<string, any> = {};
          if (tool.inputSchema?.properties) {
            for (const [propName, propDef] of Object.entries(tool.inputSchema.properties as Record<string, any>)) {
              if (propDef.type === 'integer' || propDef.type === 'number') {
                sampleArgs[propName] = 123;
              } else if (propDef.type === 'boolean') {
                sampleArgs[propName] = true;
              } else {
                sampleArgs[propName] = `sample_${propName}`;
              }
            }
          }
          return {
            name: `Test: ${tool.name}`,
            user_message: `Run ${tool.name}`,
            expect_tool_call: tool.name,
            expect_arguments: sampleArgs,
          };
        });

        await client.close();
      } catch (err: any) {
        console.log(pc.yellow(`⚠ Could not connect to server to auto-discover tools: ${err.message}`));
        console.log(pc.dim(`Generating template with sample test instead.`));
        discoveredTests = [
          {
            name: 'Sample test',
            expect_tool_call: 'sample_tool',
            expect_arguments: { id: 123 },
          },
        ];
      } finally {
        if (transportHandle) {
          await transportHandle.cleanup();
        }
      }
    }

    const suiteObject = {
      name: 'My MCP Server Cross-Client Test Suite',
      server: serverConfig,
      clients: ['claude', 'cursor', 'chatgpt'],
      tests: discoveredTests,
    };

    const yamlStr = stringifyYaml(suiteObject);
    await fs.writeFile(outputFile, yamlStr, 'utf-8');

    console.log(pc.green(`\n✔ Successfully generated: ${pc.bold(options.output)}`));
    console.log(`\nTo run your tests:\n  ${pc.cyan(`npx mcp-cross-test run ${options.output}`)}\n`);
  });

program.parse(process.argv);
