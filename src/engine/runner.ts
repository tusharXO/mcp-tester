import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  TestSuite,
  TestCase,
  TestResult,
  SuiteResult,
  ClientType,
  ToolDefinition,
} from '../types.js';
import { getClientProfile } from '../profiles/index.js';
import { createTransport } from '../transports/index.js';

export interface RunOptions {
  filterClients?: ClientType[];
  filterTransport?: 'stdio' | 'sse';
  timeoutMs?: number;
  baseDir?: string;
  verbose?: boolean;
}

export async function runTestSuite(
  suite: TestSuite,
  options: RunOptions = {}
): Promise<SuiteResult> {
  const overallStart = performance.now();
  const results: TestResult[] = [];

  const targetClients: ClientType[] = options.filterClients && options.filterClients.length > 0
    ? options.filterClients
    : suite.clients;

  const transportType = suite.server.transport;
  if (options.filterTransport && options.filterTransport !== transportType) {
    return {
      suiteName: suite.name,
      total: 0,
      passed: 0,
      failed: 0,
      durationMs: 0,
      results: [],
    };
  }

  for (const clientType of targetClients) {
    const profile = getClientProfile(clientType);
    let transportHandle;
    let client: Client | undefined;

    try {
      transportHandle = await createTransport(suite.server, options.baseDir);
      client = new Client(profile.clientInfo, {
        capabilities: profile.capabilities,
      });

      // Connect to server
      await client.connect(transportHandle.transport);

      // Discover tools
      const listResponse = await client.listTools();
      const toolsMap = new Map<string, ToolDefinition>();
      for (const t of listResponse.tools) {
        toolsMap.set(t.name, t as ToolDefinition);
      }

      // Check client-specific tool definition validations
      const toolValidationErrors: Record<string, string> = {};
      if (profile.validateToolDefinition) {
        for (const [tName, toolDef] of toolsMap.entries()) {
          const valResult = profile.validateToolDefinition(toolDef);
          if (!valResult.valid && valResult.error) {
            toolValidationErrors[tName] = valResult.error;
          }
        }
      }

      // Execute each test case for this client
      for (const testCase of suite.tests) {
        if (testCase.skip_clients && testCase.skip_clients.includes(clientType)) {
          continue;
        }

        const testStart = performance.now();
        const expectedTool = testCase.expect_tool_call;

        // Check if tool is blocked by client profile validation
        if (toolValidationErrors[expectedTool]) {
          results.push({
            testName: testCase.name,
            client: clientType,
            transport: transportType,
            passed: false,
            durationMs: Math.round(performance.now() - testStart),
            error: toolValidationErrors[expectedTool],
            details: {
              toolCalled: expectedTool,
            },
          });
          continue;
        }

        // Check tool existence
        const tool = toolsMap.get(expectedTool);
        if (!tool) {
          const available = Array.from(toolsMap.keys()).join(', ') || 'none';
          results.push({
            testName: testCase.name,
            client: clientType,
            transport: transportType,
            passed: false,
            durationMs: Math.round(performance.now() - testStart),
            error: `Tool '${expectedTool}' was not exposed by the server. Available tools: [${available}]`,
            details: {
              toolCalled: expectedTool,
            },
          });
          continue;
        }

        // Transform arguments simulating client LLM behavior
        const transformedArgs = profile.transformArguments(
          expectedTool,
          tool.inputSchema,
          testCase.expect_arguments || {}
        );

        try {
          // Perform tool call
          const response = await client.callTool({
            name: expectedTool,
            arguments: transformedArgs,
          });

          const testDuration = Math.round(performance.now() - testStart);

          // Check if response is flagged as error
          if (response.isError) {
            const errorText = extractResponseText(response) || 'Tool execution returned isError: true';
            if (testCase.expect_error) {
              results.push({
                testName: testCase.name,
                client: clientType,
                transport: transportType,
                passed: true,
                durationMs: testDuration,
                details: {
                  toolCalled: expectedTool,
                  argumentsSent: transformedArgs,
                  rawResponse: response,
                },
              });
            } else {
              results.push({
                testName: testCase.name,
                client: clientType,
                transport: transportType,
                passed: false,
                durationMs: testDuration,
                error: `Tool call failed on ${profile.displayName}: ${errorText}`,
                details: {
                  toolCalled: expectedTool,
                  argumentsSent: transformedArgs,
                  rawResponse: response,
                },
              });
            }
            continue;
          }

          // If we expected an error but got success
          if (testCase.expect_error) {
            results.push({
              testName: testCase.name,
              client: clientType,
              transport: transportType,
              passed: false,
              durationMs: testDuration,
              error: `Expected tool call to fail on ${profile.displayName}, but it succeeded.`,
              details: {
                toolCalled: expectedTool,
                argumentsSent: transformedArgs,
                rawResponse: response,
              },
            });
            continue;
          }

          // Check expect_result assertions
          if (testCase.expect_result) {
            const matchError = assertResultMatches(testCase.expect_result, response);
            if (matchError) {
              results.push({
                testName: testCase.name,
                client: clientType,
                transport: transportType,
                passed: false,
                durationMs: testDuration,
                error: matchError,
                diff: {
                  expected: testCase.expect_result,
                  actual: response,
                },
                details: {
                  toolCalled: expectedTool,
                  argumentsSent: transformedArgs,
                  rawResponse: response,
                },
              });
              continue;
            }
          }

          // Passed!
          results.push({
            testName: testCase.name,
            client: clientType,
            transport: transportType,
            passed: true,
            durationMs: testDuration,
            details: {
              toolCalled: expectedTool,
              argumentsSent: transformedArgs,
              rawResponse: response,
            },
          });
        } catch (err: any) {
          const testDuration = Math.round(performance.now() - testStart);
          const errMsg = err.message || String(err);

          if (testCase.expect_error) {
            results.push({
              testName: testCase.name,
              client: clientType,
              transport: transportType,
              passed: true,
              durationMs: testDuration,
              details: {
                toolCalled: expectedTool,
                argumentsSent: transformedArgs,
              },
            });
          } else {
            let fullErr = `Error executing tool '${expectedTool}' on ${profile.displayName}: ${errMsg}`;
            if (transportHandle.stderrOutput.length > 0) {
              fullErr += `\n[Server stderr]:\n${transportHandle.stderrOutput.join('')}`;
            }
            results.push({
              testName: testCase.name,
              client: clientType,
              transport: transportType,
              passed: false,
              durationMs: testDuration,
              error: fullErr,
              details: {
                toolCalled: expectedTool,
                argumentsSent: transformedArgs,
              },
            });
          }
        }
      }
    } catch (clientErr: any) {
      // Failed during connect or tool listing
      let errMessage = clientErr.message || String(clientErr);
      if (transportHandle && transportHandle.stderrOutput.length > 0) {
        errMessage += `\n[Server stderr]:\n${transportHandle.stderrOutput.join('')}`;
      }
      for (const testCase of suite.tests) {
        if (!testCase.skip_clients || !testCase.skip_clients.includes(clientType)) {
          results.push({
            testName: testCase.name,
            client: clientType,
            transport: transportType,
            passed: false,
            durationMs: 0,
            error: `Connection/Handshake failed for ${profile.displayName}: ${errMessage}`,
          });
        }
      }
    } finally {
      if (transportHandle) {
        await transportHandle.cleanup();
      }
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    suiteName: suite.name,
    total: results.length,
    passed,
    failed,
    durationMs: Math.round(performance.now() - overallStart),
    results,
  };
}

function extractResponseText(response: any): string | null {
  if (response && Array.isArray(response.content)) {
    const textParts = response.content
      .filter((c: any) => c.type === 'text' && typeof c.text === 'string')
      .map((c: any) => c.text);
    if (textParts.length > 0) {
      return textParts.join('\n');
    }
  }
  return null;
}

function assertResultMatches(expected: Record<string, unknown>, response: any): string | null {
  const text = extractResponseText(response);
  if (!text) {
    return `Expected response to contain fields from ${JSON.stringify(expected)}, but response content was empty.`;
  }

  // Try parsing response text as JSON
  let parsedJson: any = null;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    // If not JSON, check if expected values appear as substrings
    for (const [key, val] of Object.entries(expected)) {
      const valStr = String(val);
      if (!text.includes(valStr)) {
        return `Expected text content to contain '${valStr}' for property '${key}', but received: "${text}"`;
      }
    }
    return null;
  }

  // If JSON, verify expected key/value pairs
  for (const [key, expectedVal] of Object.entries(expected)) {
    const actualVal = parsedJson[key];
    if (actualVal === undefined) {
      return `Result missing expected property '${key}'. Received keys: [${Object.keys(parsedJson).join(', ')}]`;
    }
    if (JSON.stringify(actualVal) !== JSON.stringify(expectedVal)) {
      return `Mismatch for property '${key}': expected ${JSON.stringify(expectedVal)}, received ${JSON.stringify(actualVal)}`;
    }
  }

  return null;
}
