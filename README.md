# `mcp-tester` 🧪

> **Playwright for MCP**: Cross-client automated testing framework for Model Context Protocol servers. Catch client-specific discrepancies across Claude, Cursor, and ChatGPT before your users do.

---

## The Problem

MCP ("Model Context Protocol") servers work great in local testing, but often break when connected through different host applications:
- **Claude Desktop** strictly expects typed JSON schema arguments and preserves integer types.
- **Cursor** indexes schemas strictly, caches tools aggressively, and silently hides tools if the schema format deviates.
- **ChatGPT** function calling frequently coerces numeric IDs to strings (e.g. `"4521"` instead of integer `4521`) or passes nested objects as JSON stringified strings.

Without automated cross-client testing, your server might work in Claude Desktop while silently failing in Cursor or crashing in ChatGPT.

`mcp-tester` automates cross-client testing in CI/CD, running your test suite against simulated client profiles over both **stdio** and **SSE** transports.

---

## Features

- 🎭 **Cross-Client Simulation Matrix**: Tests servers against behavioral profiles for **Claude Desktop**, **Cursor IDE**, and **ChatGPT**.
- 🔌 **Dual Transport Support**: Works seamlessly with local process **stdio** and remote/local **SSE** endpoints.
- 📝 **Declarative YAML Test Suites**: Define tests in clean, human-readable YAML specs.
- 🚦 **CI/CD Ready**: Playwright-like terminal reporter, JSON output format, and proper exit codes (0 for pass, 1 for fail).
- ⚡ **Zero External API Costs**: Simulates LLM formatting quirks locally without requiring paid OpenAI or Anthropic API keys.

---

## Quickstart

### 1. Installation

```bash
npm install -g mcp-tester
# or install locally in your MCP server repository
npm install --save-dev mcp-tester
```

### 2. Define a Test Suite (`order-test.yaml`)

```yaml
name: "Order Lookup MCP Server Test Suite"

# Define how to connect to the MCP server
server:
  transport: "stdio"
  command: "node"
  args: ["./dist/server.js"]

# Clients to simulate
clients:
  - claude
  - cursor
  - chatgpt

# Tests to run
tests:
  - name: "User asks about order status"
    user_message: "where's my order 4521?"
    expect_tool_call: "lookup_order"
    expect_arguments:
      order_id: 4521
    expect_result:
      status: "shipped"

  - name: "User tracks order shipment"
    user_message: "track shipment TRK-98765"
    expect_tool_call: "get_order_tracking"
    expect_arguments:
      tracking_number: "TRK-98765"
    expect_result:
      status: "in_transit"
```

### 3. Run the Tests

```bash
# Run against all clients
npx mcp-tester run order-test.yaml

# Test only a specific client
npx mcp-tester run order-test.yaml --client claude

# Output results as JSON for CI pipelines
npx mcp-tester run order-test.yaml --json
```

---

## Example Output

When a client discrepancy occurs (such as ChatGPT sending `"4521"` instead of integer `4521` to a strict integer-expecting tool):

```text
============================================================
 MCP Cross-Client Suite: OrderLookup MCP Server Test Suite
============================================================

Test: User asks about order status
  ✔ CLAUDE   (stdio)  3ms
  ✔ CURSOR   (stdio)  3ms
  ✖ CHATGPT  (stdio)  3ms
      Tool call failed on ChatGPT (Web / Apps): [OrderLookup Error]: 'order_id' must be an integer, but received type 'string' with value "4521".
      Arguments sent by client LLM:
      {
        "order_id": "4521"
      }

Test: User tracks order shipment
  ✔ CLAUDE   (stdio)  2ms
  ✔ CURSOR   (stdio)  1ms
  ✔ CHATGPT  (stdio)  1ms

------------------------------------------------------------
 Results: 5 passed, 1 failed, 6 total (3002ms)
============================================================
```

---

## Testing SSE Servers

To test an MCP server exposed over HTTP/SSE:

```yaml
name: "Remote MCP Server Test Suite"

server:
  transport: "sse"
  url: "http://localhost:3000/sse"

clients:
  - claude
  - cursor
  - chatgpt

tests:
  - name: "Query inventory"
    expect_tool_call: "query_inventory"
    expect_arguments:
      sku: "KEYBOARD-RGB"
    expect_result:
      in_stock: true
```

---

## GitHub Actions Integration

Add this workflow to `.github/workflows/mcp-test.yml`:

```yaml
name: MCP Server Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Run MCP Cross-Client Tests
        run: npx mcp-tester run examples/order-test.yaml
```

---

## Programmatic API

You can also run tests programmatically in your own test runner:

```typescript
import { parseTestSuiteFile, runTestSuite } from 'mcp-tester';

const { suite, baseDir } = await parseTestSuiteFile('./order-test.yaml');
const results = await runTestSuite(suite, { baseDir });

console.log(`Passed: ${results.passed}/${results.total}`);
```

---

## License

MIT
