import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const PORT = 3888;

const server = new Server(
  {
    name: 'order-lookup-sse-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'lookup_order',
        description: 'Lookup an order by numeric order ID in the e-commerce database',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'integer',
              description: 'The unique numeric order ID',
            },
          },
          required: ['order_id'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === 'lookup_order') {
    const orderId = (args as any)?.order_id;
    if (typeof orderId !== 'number') {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `[OrderLookup Error]: 'order_id' must be an integer, but received type '${typeof orderId}' with value "${orderId}".`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            order_id: orderId,
            status: 'shipped',
          }),
        },
      ],
    };
  }
  throw new Error(`Unknown tool: ${name}`);
});

let transport: SSEServerTransport | null = null;

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/sse') {
    transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
    return;
  }

  if (url.pathname === '/messages' && req.method === 'POST') {
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.writeHead(400).end('SSE connection not initialized');
    }
    return;
  }

  res.writeHead(404).end('Not Found');
});

httpServer.listen(PORT, () => {
  console.log(`Dummy SSE MCP Server listening at http://localhost:${PORT}/sse`);
});
