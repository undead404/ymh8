import { describe, expect, it } from 'vitest';

import compareOldNewList, {
  type ParticularTagListItem,
} from './compare-old-new-list.js'; // Update path

// --- Test Helpers ---
const createItem = (
  place: number,
  name: string,
  artist = 'Artist',
): ParticularTagListItem => ({
  place,
  albumName: name,
  albumArtist: artist,
});

const getSig = (name: string, artist = 'Artist') => `${artist} - ${name}`;

describe('compareOldNewList', () => {
  describe('1. Database Operations (toInsert, toUpdate, toEnrich)', () => {
    it('identifies slots to UPDATE when position existed previously', () => {
      const oldList = [createItem(1, 'A')];
      const newList = [createItem(1, 'B')];

      const result = compareOldNewList(oldList, newList, 1);

      expect(result.toUpdate).toHaveLength(1);
      expect(result.toInsert).toHaveLength(0);
      expect(result.toUpdate[0]!.albumName).toBe('B');
    });

    it('identifies slots to INSERT when chart expands', () => {
      const oldList = [createItem(1, 'A')];
      // Chart expands to size 2
      const newList = [createItem(1, 'A'), createItem(2, 'B')];

      const result = compareOldNewList(oldList, newList, 2);

      // Slot 1 exists & same -> Nothing to do
      // Slot 2 is new -> Insert
      expect(result.toUpdate).toHaveLength(0);
      expect(result.toInsert).toHaveLength(1);
      expect(result.toInsert[0]!.albumName).toBe('B');
    });

    it('identifies items to ENRICH only when the Album Signature is new', () => {
      // 'A' exists in old list. 'B' is brand new.
      const oldList = [createItem(1, 'A')];
      const newList = [createItem(1, 'A'), createItem(2, 'B')];

      const result = compareOldNewList(oldList, newList, 2);

      expect(result.toEnrich).toHaveLength(1);
      expect(result.toEnrich[0]!.albumName).toBe('B');
    });

    it('does NOT enrich items that exist but moved position', () => {
      const oldList = [createItem(1, 'A')];
      const newList = [createItem(2, 'A'), createItem(1, 'B')];

      const result = compareOldNewList(oldList, newList, 2);

      // A is known, B is new
      expect(result.toEnrich.map((index) => index.albumName)).not.toContain(
        'A',
      );
      expect(result.toEnrich.map((index) => index.albumName)).toContain('B');
    });
  });

  describe('2. Visual Reporting (ChangeList)', () => {
    it('handles exact matches (Stable)', () => {
      const list = [createItem(1, 'A'), createItem(2, 'B')];
      const result = compareOldNewList(list, list, 2);

      // No changes should be logged
      expect(result.changeList).toHaveLength(0);
    });

    it('reports a Drop (❌) when an item completely disappears', () => {
      const oldList = [createItem(1, 'A')];
      const newList = [createItem(1, 'B')]; // A is gone

      const result = compareOldNewList(oldList, newList, 1);

      // Should show X for A, and + for B
      expect(result.changeList).toEqual([
        ['❌', '', getSig('A')],
        ['➕', '1', getSig('B')],
      ]);
    });

    it('reports a New Entry (➕)', () => {
      const oldList = [createItem(1, 'A')];
      const newList = [createItem(1, 'A'), createItem(2, 'B')];

      const result = compareOldNewList(oldList, newList, 2);

      const changeForB = result.changeList.find(
        (c) => Array.isArray(c) && c[2].includes('B'),
      );
      expect(changeForB).toEqual(['➕', '2', getSig('B')]);
    });

    it('reports standard Movement (⬆️ / ⬇️)', () => {
      // Swap: A goes 1->2 (Down), B goes 2->1 (Up)
      const oldList = [createItem(1, 'A'), createItem(2, 'B')];
      const newList = [createItem(1, 'B'), createItem(2, 'A')];

      const result = compareOldNewList(oldList, newList, 2);

      expect(result.changeList).toContainEqual(['⬆️', '1←2', getSig('B')]);
      expect(result.changeList).toContainEqual(['⬇️', '2←1', getSig('A')]);
    });
  });

  describe('3. Complex Logic: Block Moves (…)', () => {
    it('collapses cascading downward shifts into ellipses', () => {
      // A, B, C are pushed down by X
      const oldList = [
        createItem(1, 'A'),
        createItem(2, 'B'),
        createItem(3, 'C'),
      ];
      const newList = [
        createItem(1, 'X'), // New
        createItem(2, 'A'), // Moved 1 -> 2
        createItem(3, 'B'), // Moved 2 -> 3 (Block move start)
        createItem(4, 'C'), // Moved 3 -> 4 (Block move continuation)
      ];

      const result = compareOldNewList(oldList, newList, 4);

      // 1. X is New ['➕', '1', 'X']
      // 2. A moved ['⬇️', '2←1', 'A']
      // 3. B moved same amount as A -> '…'
      // 4. C moved same amount as B -> '…' (should not duplicate if logic handles it)

      const changes = result.changeList;

      expect(changes[0]).toEqual(['➕', '1', getSig('X')]);
      expect(changes[1]).toEqual(['⬇️', '2←1', getSig('A')]);

      // We expect a single ellipsis following the first block mover
      expect(changes[2]).toBe('…');

      // Ensure we don't get double ellipses for C if the logic prevents duplicates
      // Logic: if (changeList.at(-1) !== '…')
      expect(changes).toHaveLength(3);
    });

    it('breaks the block move if the offset changes', () => {
      const oldList = [createItem(1, 'A'), createItem(2, 'B')];

      // Scenario:
      // A moves +1 (1 -> 2)
      // B moves +2 (2 -> 4)
      // Because the offsets (+1 vs +2) differ, they should NOT be collapsed into "..."
      // We must provide an item for place 3 to prevent the helper from crashing.
      const newList = [
        createItem(1, 'X'), // 1. New entry
        createItem(2, 'A'), // 2. A moved here (+1 offset)
        createItem(3, 'Filler'), // 3. Filler item (Required for continuity)
        createItem(4, 'B'), // 4. B moved here (+2 offset)
      ];

      const result = compareOldNewList(oldList, newList, 4);

      const aChange = result.changeList.find(
        (x) => Array.isArray(x) && x[2] === getSig('A'),
      );
      const bChange = result.changeList.find(
        (x) => Array.isArray(x) && x[2] === getSig('B'),
      );

      // Both should exist as distinct change entries
      expect(aChange).toBeDefined();
      expect(bChange).toBeDefined();

      // Verify specific movement logic if desired
      expect(aChange).toEqual(['⬇️', '2←1', getSig('A')]);
      expect(bChange).toEqual(['⬇️', '4←2', getSig('B')]);
    });
  });

  describe('4. Edge Cases & Validation', () => {
    it('throws error if newItem is missing at expected place', () => {
      const oldList = [createItem(1, 'A')];
      const newList: ParticularTagListItem[] = []; // Empty

      expect(() => compareOldNewList(oldList, newList, 1)).toThrowError(
        /Item at place 1 was not generated/,
      );
    });

    it('handles empty old list (fresh start)', () => {
      const oldList: ParticularTagListItem[] = [];
      const newList = [createItem(1, 'A')];

      const result = compareOldNewList(oldList, newList, 1);

      expect(result.toInsert).toHaveLength(1);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.changeList).toEqual([['➕', '1', getSig('A')]]);
    });
  });
});
