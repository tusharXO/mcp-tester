import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ServerConfig } from '../types.js';

export interface TransportHandle {
  transport: Transport;
  cleanup: () => Promise<void>;
  stderrOutput: string[];
}

export async function createTransport(
  config: ServerConfig,
  cwd?: string
): Promise<TransportHandle> {
  const stderrOutput: string[] = [];

  if (config.transport === 'stdio') {
    if (!config.command) {
      throw new Error("Server configuration missing 'command' for stdio transport.");
    }

    const mergedEnv = {
      ...process.env,
      ...(config.env || {}),
    } as Record<string, string>;

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: mergedEnv,
      cwd: config.cwd || cwd || process.cwd(),
      stderr: 'pipe',
    });

    if (transport.stderr) {
      transport.stderr.on('data', (chunk: Buffer) => {
        const str = chunk.toString();
        stderrOutput.push(str);
      });
    }

    return {
      transport,
      stderrOutput,
      cleanup: async () => {
        try {
          await transport.close();
        } catch {
          // Ignore transport close errors during cleanup
        }
      },
    };
  } else if (config.transport === 'sse') {
    if (!config.url) {
      throw new Error("Server configuration missing 'url' for sse transport.");
    }

    const url = new URL(config.url);
    const transport = new SSEClientTransport(url);

    return {
      transport,
      stderrOutput,
      cleanup: async () => {
        try {
          await transport.close();
        } catch {
          // Ignore transport close errors during cleanup
        }
      },
    };
  }

  throw new Error(`Unsupported transport type: ${(config as any).transport}`);
}
