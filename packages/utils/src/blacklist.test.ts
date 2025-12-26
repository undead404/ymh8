import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import loadList from './utils/load-list.js';
import { createTagBlacklist } from './blacklist.js';

// 1. Mock the dependency
vi.mock('./utils/load-list');

// Helper to quickly configure what the "files" contain for a specific test run
function setupMocks(
  data: {
    exact?: string[];
    start?: string[];
    end?: string[];
    sub?: string[];
  } = {},
) {
  (loadList as Mock).mockImplementation(async (filename: string) => {
    switch (filename) {
      case 'blacklisted-tags.txt': {
        return data.exact || [];
      }
      case 'blacklisted-tag-starts.txt': {
        return data.start || [];
      }
      case 'blacklisted-tag-ends.txt': {
        return data.end || [];
      }
      case 'blacklisted-tag-substrings.txt': {
        return data.sub || [];
      }
      default: {
        return [];
      }
    }
  });
}

describe('createTagBlacklist', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Structural Validation (Cheap Checks)', () => {
    it('blocks tags that are too short or too long', async () => {
      setupMocks(); // Empty blacklists
      const { isBlacklisted } = await createTagBlacklist();

      expect(isBlacklisted('a')).toBe(true); // Too short (< 2)
      expect(isBlacklisted('a'.repeat(41))).toBe(true); // Too long (> 40)
      expect(isBlacklisted('valid-length')).toBe(false);
    });

    it('blocks tags that fail the alphanumeric format regex', async () => {
      setupMocks();
      const { isBlacklisted } = await createTagBlacklist();

      expect(isBlacklisted('tag#invalid')).toBe(true); // Special char
      expect(isBlacklisted('-starts-with-dash')).toBe(true); // Regex requires start with \w
      expect(isBlacklisted('ends-with-dash-')).toBe(true); // Regex requires end with \w
      expect(isBlacklisted('ALLCAPS')).toBe(true); // Regex requires at least one [a-z]
      expect(isBlacklisted('valid-tag-123')).toBe(false);
    });
  });

  describe('Blacklist Logic', () => {
    it('blocks exact matches (case-insensitive)', async () => {
      setupMocks({ exact: ['badword', 'offensive'] });
      const { isBlacklisted } = await createTagBlacklist();

      expect(isBlacklisted('badword')).toBe(true);
      expect(isBlacklisted('BadWord')).toBe(true); // Case check
      expect(isBlacklisted('offensive')).toBe(true);
      expect(isBlacklisted('badword-suffix')).toBe(false); // Exact means exact
    });

    it('blocks prefixes using the starts-with list', async () => {
      setupMocks({ start: ['sys-', 'admin'] });
      const { isBlacklisted } = await createTagBlacklist();

      expect(isBlacklisted('sys-control')).toBe(true);
      expect(isBlacklisted('AdminUser')).toBe(true); // Case insensitive
      expect(isBlacklisted('not-sys-control')).toBe(false); // Should not match inside
    });

    it('blocks suffixes using the ends-with list', async () => {
      setupMocks({ end: ['-bot', '.exe'] });
      const { isBlacklisted } = await createTagBlacklist();

      expect(isBlacklisted('chat-bot')).toBe(true);
      expect(isBlacklisted('file.exe')).toBe(true); // Note: dot logic checks below
      expect(isBlacklisted('chat-bot-user')).toBe(false); // Should not match inside
    });

    it('blocks substrings using the substring list', async () => {
      setupMocks({ sub: ['kill', 'dump'] });
      const { isBlacklisted } = await createTagBlacklist();

      expect(isBlacklisted('skill-set')).toBe(true); // Contains 'kill'
      expect(isBlacklisted('data-dump-log')).toBe(true);
      expect(isBlacklisted('safe-tag')).toBe(false);
    });
  });

  describe('Regex Safety & Reloading', () => {
    it('escapes special regex characters in the input files', async () => {
      // If code didn't escape '.', 'c.t' would match 'cat', 'cut', etc.
      setupMocks({ sub: ['c.t', 'c++'] });
      const { isBlacklisted } = await createTagBlacklist();

      expect(isBlacklisted('visual-c++')).toBe(true); // Should match literal +
      expect(isBlacklisted('c.t-value')).toBe(true); // Should match literal .
      expect(isBlacklisted('cat-value')).toBe(false); // '.' should NOT be a wildcard
    });

    it('reloads data when reload() is called', async () => {
      // 1. Initial state
      setupMocks({ exact: ['foo'] });
      const blacklist = await createTagBlacklist();
      expect(blacklist.isBlacklisted('foo')).toBe(true);
      expect(blacklist.isBlacklisted('bar')).toBe(false);

      // 2. Change file content "on disk"
      setupMocks({ exact: ['foo', 'bar'] });

      // 3. Trigger reload
      await blacklist.reload();

      // 4. Verify new state
      expect(blacklist.isBlacklisted('bar')).toBe(true);
    });
  });
});
