# Contributing to `mcp-cross-test` 🧪

Thank you for your interest in contributing to `mcp-cross-test`! 

Our mission is to ensure every Model Context Protocol (MCP) server runs reliably across every AI host application.

---

## Adding a New Client Profile

Do you want to add support for testing another client (like **Zed IDE**, **LibreChat**, **Continue.dev**, or **Gemini CLI**)?

1. Create a new profile file in `src/profiles/<client-name>.ts`.
2. Implement the `ClientProfile` interface:
   ```typescript
   import { ClientProfile } from '../types.js';

   export const myClientProfile: ClientProfile = {
     id: 'my-client',
     displayName: 'My Client Name',
     clientInfo: {
       name: 'my-client-app',
       version: '1.0.0',
     },
     capabilities: {
       // capabilities advertised by this client
     },
     transformArguments: (toolName, toolSchema, idealArgs) => {
       // Simulate client-specific argument formatting or LLM quirks
       return idealArgs;
     },
     validateToolDefinition: (tool) => {
       // Check if this client requires specific schemas or hides tools
       return { valid: true };
     },
   };
   ```
3. Register the new profile in `src/profiles/index.ts`.
4. Add unit tests in `tests/profiles.test.ts`.

---

## Development & Testing

```bash
# Clone the repository
git clone https://github.com/tusharXO/mcp-tester.git
cd mcp-tester

# Install dependencies
npm install

# Run the test suite
npm test

# Build TypeScript
npm run build

# Run local example test
npm run example:stdio
```

---

## Submitting Pull Requests

1. Fork the repo and create your feature branch: `git checkout -b feature/my-new-feature`
2. Commit your changes: `git commit -m "feat: add support for Zed IDE client"`
3. Verify all tests pass: `npm test`
4. Open a Pull Request on GitHub.
