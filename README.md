# `mcp-cross-test` 🧪

[![npm version](https://img.shields.io/npm/v/mcp-cross-test.svg)](https://www.npmjs.com/package/mcp-cross-test)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Cross-Client Verified](https://img.shields.io/badge/MCP_Cross--Client-Verified-success)](https://github.com/tusharXO/mcp-tester)

> **Playwright for MCP**: Cross-client automated testing framework for Model Context Protocol servers. Catch client-specific discrepancies across **Claude Desktop**, **Cursor IDE**, and **ChatGPT** before your users do.

---

## The Problem

MCP ("Model Context Protocol") servers work great in local development, but often break when connected through different host applications:
- **Claude Desktop** strictly expects typed JSON schema arguments and preserves integer types.
- **Cursor** indexes schemas strictly, caches tools aggressively, and silently hides tools if the schema format deviates (e.g. missing `type: "object"`).
- **ChatGPT** function calling frequently coerces numeric IDs to strings (e.g. `"4521"` instead of integer `4521`) or passes nested objects as JSON stringified strings.

Without automated cross-client testing, your server might work in Claude Desktop while silently failing in Cursor or throwing unexpected runtime exceptions in ChatGPT.

`mcp-cross-test` automates cross-client testing in CI/CD, running your test suite against simulated client profiles over both **stdio** and **SSE** transports with zero external LLM API costs.

---

## Features

- 🎭 **Cross-Client Simulation Matrix**: Tests servers against behavioral profiles for **Claude Desktop**, **Cursor IDE**, and **ChatGPT**.
- 🪄 **Auto-Discovery Scaffolding (`init`)**: Connects to your MCP server and automatically scaffolds a test suite from your exposed tools.
- 🔌 **Dual Transport Support**: Works seamlessly with local process **stdio** and remote/local **SSE** endpoints.
- 📝 **Declarative YAML Test Suites**: Define tests in clean, human-readable YAML specs.
- 🚦 **CI/CD Ready**: Playwright-like terminal reporter, JSON output format, and proper exit codes (0 for pass, 1 for fail).
- ⚡ **Zero External API Costs**: Simulates LLM formatting quirks locally without requiring paid OpenAI or Anthropic API keys.

---

## Quickstart

### 1. Zero-Config Scaffold (`init`)

Auto-discover tools from your MCP server and generate an `mcp-test.yaml` file:

```bash
# For a Node.js / TypeScript MCP server:
npx mcp-cross-test init --command "node dist/server.js"

# For a Python MCP server:
npx mcp-cross-test init --command "python server.py"

# For an SSE server:
npx mcp-cross-test init --url "http://localhost:3000/sse"
```

### 2. Run the Cross-Client Test Matrix

```bash
# Run against all clients (Claude, Cursor, ChatGPT)
npx mcp-cross-test run mcp-test.yaml

# Test only a specific client
npx mcp-cross-test run mcp-test.yaml --client claude

# Output results as JSON for CI pipelines
npx mcp-cross-test run mcp-test.yaml --json
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

## Test Specification Format (`mcp-test.yaml`)

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

## GitHub Actions CI Integration

Add this workflow to your MCP server repository at `.github/workflows/mcp-test.yml`:

```yaml
name: MCP Cross-Client Tests

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
        run: npx mcp-cross-test run mcp-test.yaml
```

Add the badge to your MCP server's README:
```markdown
[![MCP Cross-Client Verified](https://img.shields.io/badge/MCP_Cross--Client-Verified-success)](https://github.com/tusharXO/mcp-tester)
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to add new client profiles (e.g. Zed IDE, LibreChat, Gemini CLI).

---

## License

[MIT](LICENSE) © 2026 tushar1409
