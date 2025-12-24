import { describe, expect, it } from 'vitest';

import escapeForTelegram from './escape-for-telegram.js'; // Adjust path as needed

describe('escapeForTelegram', () => {
  it('returns an empty string for empty input', () => {
    expect(escapeForTelegram('')).toBe('');
  });

  it('handles null or undefined gracefully', () => {
    // @ts-expect-error Testing runtime safety for non-TS consumers
    expect(escapeForTelegram(null)).toBe('');
    // @ts-expect-error Testing runtime safety for non-TS consumers
    expect(escapeForTelegram()).toBe('');
  });

  it('returns standard text unchanged', () => {
    const input = 'Hello World';
    expect(escapeForTelegram(input)).toBe(input);
  });

  it('escapes specific Telegram HTML entities', () => {
    expect(escapeForTelegram('&')).toBe('&amp;');
    expect(escapeForTelegram('<')).toBe('&lt;');
    expect(escapeForTelegram('>')).toBe('&gt;');
  });

  it('correctly handles mixed content', () => {
    const input = 'Logs: <error> & "warning"';
    const expected = 'Logs: &lt;error&gt; &amp; "warning"';
    expect(escapeForTelegram(input)).toBe(expected);
  });

  it('preserves order of operations to prevent double escaping', () => {
    // Critical Test: If '&' is not replaced first, '<' becomes '&lt;',
    // and the '&' inside '&lt;' would be escaped again to '&amp;lt;'.

    // Test case: A simple tag
    expect(escapeForTelegram('<')).toBe('&lt;');
    expect(escapeForTelegram('<')).not.toBe('&amp;lt;');

    // Test case: Complex sequence
    const input = '1 < 2 && 4 > 3';
    const expected = '1 &lt; 2 &amp;&amp; 4 &gt; 3';
    expect(escapeForTelegram(input)).toBe(expected);
  });
});
