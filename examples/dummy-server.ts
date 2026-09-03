import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'order-lookup-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register available tools
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
      {
        name: 'get_order_tracking',
        description: 'Get carrier tracking details for an order',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_number: {
              type: 'string',
              description: 'Tracking code string',
            },
          },
          required: ['tracking_number'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'lookup_order') {
    const orderId = (args as any)?.order_id;

    // Simulate strict server requirement: code assumes order_id is number because schema says 'integer'
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

    if (orderId === 4521) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              order_id: 4521,
              status: 'shipped',
              carrier: 'FedEx',
              eta: 'Tomorrow by 5 PM',
            }),
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
            status: 'not_found',
          }),
        },
      ],
    };
  }

  if (name === 'get_order_tracking') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            tracking: (args as any)?.tracking_number,
            status: 'in_transit',
          }),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((err) => {
  console.error('Fatal error in dummy server:', err);
  process.exit(1);
});
