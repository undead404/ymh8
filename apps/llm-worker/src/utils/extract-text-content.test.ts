import { describe, expect, it } from 'vitest';

import extractTextContent from './extract-text-content.js';

describe('extractTextContent', () => {
  it('returns non-empty Responses API text', () => {
    expect(extractTextContent({ output_text: 'description' })).toBe(
      'description',
    );
  });

  it.each([
    null,
    {},
    { output_text: '' },
    { output_text: '   ' },
    { output_text: 42 },
  ])('rejects unusable provider output: %j', (response) => {
    expect(() => extractTextContent(response)).toThrow(
      'OpenAI response did not contain non-empty text',
    );
  });
});
