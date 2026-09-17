import { describe, expect, it } from 'vitest';

import isArtistNegligible from './is-artist-negligible.js';

describe('isArtistNegligible', () => {
  it.each(['[unknown]', 'undefined'])(
    'returns true for the placeholder %s',
    (name) => {
      expect(isArtistNegligible({ name })).toBe(true);
    },
  );

  it('returns true for leading, trailing, and repeated whitespace', () => {
    expect(isArtistNegligible({ name: ' Artist' })).toBe(true);
    expect(isArtistNegligible({ name: 'Artist ' })).toBe(true);
    expect(isArtistNegligible({ name: 'The  Artist' })).toBe(true);
  });

  it('returns false for a named artist', () => {
    expect(isArtistNegligible({ name: 'Test artist' })).toBe(false);
  });
});
