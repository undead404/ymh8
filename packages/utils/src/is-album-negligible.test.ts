import { describe, expect, it } from 'vitest';

import isAlbumNegligible from './is-album-negligible.js'; // Adjust path

// Mock interface for BareAlbum to satisfy the type requirement
const createAlbum = (name: string) => ({ artist: 'Test artist', name });

describe('isAlbumNegligible', () => {
  describe('String Blocklist', () => {
    it('returns true for exact blacklisted strings', () => {
      expect(isAlbumNegligible(createAlbum('ClearMusicDownloader'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('undefined'))).toBe(true);
    });

    it('returns false for partial matches of blacklisted strings', () => {
      // The code uses strict equality (===) for string entries
      expect(isAlbumNegligible(createAlbum('ClearMusicDownloader 2'))).toBe(
        false,
      );
    });
  });

  describe('Whitespace Patterns', () => {
    it('detects leading or trailing whitespace', () => {
      expect(isAlbumNegligible(createAlbum(' Album'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('Album '))).toBe(true);
    });

    it('detects double spaces inside the name', () => {
      expect(isAlbumNegligible(createAlbum('The  Album'))).toBe(true);
    });
  });

  describe('Keyword Patterns', () => {
    it('detects "bootleg" case-insensitively', () => {
      expect(isAlbumNegligible(createAlbum('Live Bootleg'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('bootleg series'))).toBe(true);
    });

    it('detects CD numbering (aggressive match)', () => {
      // Matches /cd\d/i
      expect(isAlbumNegligible(createAlbum('Mix CD1'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('cd2'))).toBe(true);

      // CRITICAL: This regex has no boundaries, so it flags valid words ending in cd + digit
      expect(isAlbumNegligible(createAlbum('ABCD1'))).toBe(true);
    });

    it('detects verbose disc numbering', () => {
      expect(isAlbumNegligible(createAlbum('Greatest Hits Disc 1'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('Anthology (Disk 2)'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('Live cd 3'))).toBe(true);
    });
  });

  describe('Bonus Content Patterns', () => {
    it('detects "(Bonus)" at the end of string', () => {
      // Matches /[[(]bonus[[()\]]$/i
      expect(isAlbumNegligible(createAlbum('Album (Bonus)'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('Album [Bonus]'))).toBe(true);
    });

    it('detects verbose bonus descriptions', () => {
      // Matches /[[(]?bonus (?:tracks?|dis(?:c|k))[)\]]?$/i
      expect(isAlbumNegligible(createAlbum('Album Bonus Tracks'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('Album (Bonus Disc)'))).toBe(true);
      expect(isAlbumNegligible(createAlbum('Album [Bonus Disk]'))).toBe(true);
    });
  });

  describe('Valid Albums', () => {
    it('returns false for standard album names', () => {
      expect(isAlbumNegligible(createAlbum('Thriller'))).toBe(false);
      expect(isAlbumNegligible(createAlbum('1989'))).toBe(false);
    });

    it('returns false for "bonus" used in non-negligible contexts', () => {
      // "Bonus" not at the end or inside brackets is currently allowed
      expect(isAlbumNegligible(createAlbum('The Bonus Room'))).toBe(false);
    });
  });
});
