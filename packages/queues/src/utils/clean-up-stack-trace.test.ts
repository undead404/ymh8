import { describe, expect, it } from 'vitest';

import cleanUpStackTrace from './clean-up-stack-trace.js';

describe('cleanUpStackTrace', () => {
  it('returns an empty string for null, undefined, or non-array inputs', () => {
    // @ts-expect-error Testing runtime safety
    expect(cleanUpStackTrace(null)).toBe('');
    // @ts-expect-error Testing runtime safety
    expect(cleanUpStackTrace()).toBe('');
    // @ts-expect-error Testing runtime safety
    expect(cleanUpStackTrace('Not an array')).toBe('');
  });

  it('returns an empty string for an empty array', () => {
    expect(cleanUpStackTrace([])).toBe('');
  });

  it('removes lines containing "node_modules"', () => {
    const input = [
      'Error: Something went wrong',
      '    at myCode (/app/src/index.ts:10:5)',
      '    at someLib (/app/node_modules/lib/index.js:50:5)', // Should go
      '    at another (/app/src/utils.ts:5:5)',
    ].join('\n');

    const expected = [
      'Error: Something went wrong',
      '    at myCode (/app/src/index.ts:10:5)',
      '    at another (/app/src/utils.ts:5:5)',
    ].join('\n');

    expect(cleanUpStackTrace([input])).toBe(expected);
  });

  it('removes lines containing "node:internal"', () => {
    const input = [
      'Error: Connection failed',
      '    at myService (/app/service.ts:20:10)',
      '    at node:internal/process/task_queues:96:5', // Should go
    ].join('\n');

    const expected = [
      'Error: Connection failed',
      '    at myService (/app/service.ts:20:10)',
    ].join('\n');

    expect(cleanUpStackTrace([input])).toBe(expected);
  });

  it('joins multiple stacktrace items correctly', () => {
    // BullMQ stacktraces are arrays of strings
    const input = ['Error 1\n at file1.ts', 'Error 2\n at file2.ts'];

    const expected = 'Error 1\n at file1.ts\nError 2\n at file2.ts';
    expect(cleanUpStackTrace(input)).toBe(expected);
  });

  it('truncates output longer than 800 characters', () => {
    // Create a string that passes filters but is too long
    // 801 characters of 'a'
    const longStack = ['a'.repeat(801)];

    const result = cleanUpStackTrace(longStack);

    // Logic: rawStack.slice(0, 800) + '... (truncated)'
    expect(result.startsWith('aaaa')).toBe(true);
    expect(result).toContain('... (truncated)');
    // 800 chars + 15 chars for suffix = 815
    expect(result.length).toBe(815);
  });

  it('does not truncate output exactly 800 characters or less', () => {
    const exactStack = ['a'.repeat(800)];
    expect(cleanUpStackTrace(exactStack)).toBe(exactStack[0]);
    expect(cleanUpStackTrace(exactStack)).not.toContain('truncated');
  });

  it('handles cases where all lines are filtered', () => {
    const input = ['    at node_modules/foo', '    at node:internal/bar'].join(
      '\n',
    );

    // Should result in an empty string (actually a joined empty string depending on split logic)
    // The code splits by \n, filters all out, joins by \n -> empty string
    expect(cleanUpStackTrace([input])).toBe('');
  });
});
