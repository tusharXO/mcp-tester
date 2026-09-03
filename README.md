# mcp-cross-test

[![npm version](https://img.shields.io/npm/v/mcp-cross-test.svg)](https://www.npmjs.com/package/mcp-cross-test)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/tusharXO/mcp-tester/blob/master/LICENSE)
[![MCP Cross-Client Verified](https://img.shields.io/badge/MCP_Cross--Client-Verified-success)](https://github.com/tusharXO/mcp-tester)

Automated cross-client testing and conformance framework for Model Context Protocol (MCP) servers. Verify server reliability across **Claude Desktop**, **Cursor IDE**, **ChatGPT**, and **Antigravity IDE** in local workflows and CI/CD pipelines.

---

## Overview

Model Context Protocol (MCP) servers often function reliably in isolated local testing, but fail or behave inconsistently across different host applications:

- **Claude Desktop**: Strictly enforces schema types and preserves native JSON types (integers, booleans, nested objects).
- **Cursor IDE**: Requires strict schema indexing rules (e.g., mandatory `type: "object"`). Malformed schemas are silently hidden from the assistant without explicit error logs.
- **ChatGPT**: Frequently coerces numeric identifiers to string scalars (e.g., passing `"4521"` for an `integer` field) or stringifies nested object payloads.
- **Antigravity IDE**: Google DeepMind AI-first agentic IDE with semantic tool routing, lazy-loading negotiation, and agent capability controls.

`mcp-cross-test` runs an automated test matrix simulating each client's specific handshake, capabilities, and LLM argument behavior over both **stdio** and **SSE** transports with zero external LLM API cost.

---

## Key Capabilities

- **Cross-Client Matrix**: Runs test suites against verified profiles for Claude Desktop, Cursor, ChatGPT, and Antigravity IDE.
- **Zero-Token Simulation**: Simulates host handshakes and LLM formatting quirks locally, eliminating external API latency and token billing in CI.
- **Tool Auto-Discovery (`init`)**: Introspects running or local MCP servers to automatically generate a tailored YAML test specification.
- **Dual Transport Architecture**: Supports local child processes (`stdio`) and remote endpoints (`sse`).
- **CI/CD Conformance**: Outputs Playwright-style terminal matrices, structured JSON reports, and standard process exit codes (0 for pass, 1 for fail).

---

## Quickstart

### 1. Scaffold Test Suite (`init`)

Auto-discover exposed tools directly from your server:

```bash
# Node.js / TypeScript MCP server:
npx mcp-cross-test init --command "node dist/server.js"

# Python MCP server:
npx mcp-cross-test init --command "python server.py"

# Remote / Local SSE server:
npx mcp-cross-test init --url "http://localhost:3000/sse"
```

This generates an `mcp-test.yaml` file pre-populated with your server's tools and input parameters.

### 2. Execute Tests

```bash
# Run the complete cross-client test matrix:
npx mcp-cross-test run mcp-test.yaml

# Filter by a specific client:
npx mcp-cross-test run mcp-test.yaml --client claude

# Output structured JSON for automation:
npx mcp-cross-test run mcp-test.yaml --json
```

---

## Diagnostic Output

When an interoperability discrepancy is detected, `mcp-cross-test` isolates the exact client and failure mode:

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

## Specification Schema (`mcp-test.yaml`)

```yaml
name: "Order Lookup MCP Server Test Suite"

# Server execution parameters
server:
  transport: "stdio"
  command: "node"
  args: ["./dist/server.js"]

# Target client profiles
clients:
  - claude
  - cursor
  - chatgpt
  - antigravity

# Test assertions
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

## Remote Server Testing (SSE)

For servers exposed over HTTP/SSE:

```yaml
name: "Remote Staging MCP Test Suite"

server:
  transport: "sse"
  url: "http://localhost:3000/sse"

clients:
  - claude
  - cursor
  - chatgpt

tests:
  - name: "Check inventory status"
    expect_tool_call: "query_inventory"
    expect_arguments:
      sku: "KEYBOARD-RGB"
    expect_result:
      in_stock: true
```

---

## GitHub Actions CI Workflow

Add the following workflow file to your MCP repository at `.github/workflows/mcp-test.yml`:

```yaml
name: MCP Cross-Client Conformance

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

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
      - name: Run MCP Conformance Tests
        run: npx mcp-cross-test run mcp-test.yaml
```

To display conformance status on your README:
```markdown
[![MCP Cross-Client Verified](https://img.shields.io/badge/MCP_Cross--Client-Verified-success)](https://github.com/tusharXO/mcp-tester)
```

---

## Contributing

Contributions and new client profile submissions are welcome. Please refer to [CONTRIBUTING.md](https://github.com/tusharXO/mcp-tester/blob/master/CONTRIBUTING.md) for architecture details and profile implementation guidelines.

---

## License

[MIT](https://github.com/tusharXO/mcp-tester/blob/master/LICENSE) © 2026 tushar1409
