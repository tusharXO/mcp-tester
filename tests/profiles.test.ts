import { describe, it, expect } from 'vitest';
import {
  claudeProfile,
  cursorProfile,
  chatgptProfile,
  antigravityProfile,
  getClientProfile,
} from '../src/profiles/index.js';

describe('Client Profiles', () => {
  describe('Profile Registry', () => {
    it('retrieves profiles by type', () => {
      expect(getClientProfile('claude').id).toBe('claude');
      expect(getClientProfile('cursor').id).toBe('cursor');
      expect(getClientProfile('chatgpt').id).toBe('chatgpt');
    });

    it('throws on invalid profile type', () => {
      expect(() => getClientProfile('unknown' as any)).toThrow(/Unknown client type/);
    });
  });

  describe('Claude Profile', () => {
    it('preserves native integer numbers', () => {
      const schema = {
        properties: {
          order_id: { type: 'integer' },
        },
      };
      const args = claudeProfile.transformArguments('lookup_order', schema, { order_id: 4521 });
      expect(args.order_id).toBe(4521);
      expect(typeof args.order_id).toBe('number');
    });

    it('warns when tool lacks description', () => {
      const res = claudeProfile.validateToolDefinition!({
        name: 'test_tool',
        description: '',
      });
      expect(res.valid).toBe(false);
      expect(res.warning).toContain('lacks a description');
    });
  });

  describe('Cursor Profile', () => {
    it('strips null or undefined arguments', () => {
      const args = cursorProfile.transformArguments('lookup_order', undefined, {
        order_id: 4521,
        optional_filter: null,
        unset_field: undefined,
      });
      expect(args).toEqual({ order_id: 4521 });
    });

    it('flags error if tool inputSchema is missing or invalid type', () => {
      const res1 = cursorProfile.validateToolDefinition!({
        name: 'bad_tool',
        inputSchema: undefined,
      });
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('inputSchema is missing');

      const res2 = cursorProfile.validateToolDefinition!({
        name: 'bad_tool_2',
        inputSchema: { type: 'string' },
      });
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain("Cursor requires top-level schema type 'object'");
    });
  });

  describe('ChatGPT Profile', () => {
    it('coerces ID parameters to strings simulating typical LLM output', () => {
      const schema = {
        properties: {
          order_id: { type: 'integer', description: 'Numeric order ID' },
          count: { type: 'integer', description: 'Count of items' },
        },
      };

      const args = chatgptProfile.transformArguments('lookup_order', schema, {
        order_id: 4521,
        count: 5,
      });

      expect(args.order_id).toBe('4521');
      expect(typeof args.order_id).toBe('string');
      expect(args.count).toBe(5);
    });
  });

  describe('Antigravity IDE Profile', () => {
    it('retrieves Antigravity profile with correct clientInfo and capabilities', () => {
      const profile = getClientProfile('antigravity');
      expect(profile.displayName).toBe('Antigravity IDE');
      expect(profile.clientInfo.name).toBe('antigravity-ide');
      expect(profile.capabilities.roots?.listChanged).toBe(true);
    });

    it('preserves native typing and cleans undefined arguments', () => {
      const schema = {
        properties: {
          order_id: { type: 'integer' },
        },
      };
      const args = antigravityProfile.transformArguments('lookup_order', schema, {
        order_id: 4521,
        unwanted: undefined,
      });
      expect(args.order_id).toBe(4521);
      expect(typeof args.order_id).toBe('number');
      expect('unwanted' in args).toBe(false);
    });

    it('warns when tool lacks description for agentic routing', () => {
      const res = antigravityProfile.validateToolDefinition!({
        name: 'silent_tool',
        description: '',
      });
      expect(res.valid).toBe(false);
      expect(res.warning).toContain('Antigravity IDE agent routing requires a meaningful description');
    });
  });
});
