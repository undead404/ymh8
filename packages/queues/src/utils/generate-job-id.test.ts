import crypto from 'node:crypto';

import { describe, expect, it } from 'vitest';

import generateJobId from './generate-job-id.js';

describe('generateJobId', () => {
  it('formats the output as a BullMQ-safe operation name and hash', () => {
    const op = 'resize-image';
    const identity = 'file-123.jpg';
    const result = generateJobId(op, identity);

    expect(result).toMatch(/^resize-image-[a-f0-9]{32}$/);
  });

  it('replaces colons in operation names', () => {
    expect(generateJobId('artist:scrape:page', 'Mastodon-2')).not.toContain(
      ':',
    );
  });

  it('produces deterministic output (same input = same ID)', () => {
    const op = 'email';
    const identity = 'user@example.com';
    expect(generateJobId(op, identity)).toBe(generateJobId(op, identity));
  });

  it('produces distinct IDs for different identities', () => {
    const op = 'email';
    expect(generateJobId(op, 'a')).not.toBe(generateJobId(op, 'b'));
  });

  it('verifies the hash is specifically MD5', () => {
    const op = 'deploy';
    const identity = 'ver-1.0.0';

    // Manually calculate the expected hash using the same algorithm
    const expectedHash = crypto
      .createHash('md5')
      .update(identity)
      .digest('hex');

    expect(generateJobId(op, identity)).toBe(`deploy-${expectedHash}`);
  });

  it('handles empty strings gracefully', () => {
    expect(() => generateJobId('', '')).toThrow();
  });

  it('handles special characters in identity', () => {
    const op = 'unicode';
    const identity = '❤️'; // Multi-byte character

    const expectedHash = crypto
      .createHash('md5')
      .update(identity)
      .digest('hex');
    expect(generateJobId(op, identity)).toBe(`unicode-${expectedHash}`);
  });
});
