import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import {
  dateString,
  positivePercentage,
  type TelegramPost,
  telegramPostSchema,
} from './index.js'; // Adjust path

describe('Schemas', () => {
  describe('dateString', () => {
    it('accepts valid partial ISO strings', () => {
      expect(v.is(dateString, '2023')).toBe(true);
      expect(v.is(dateString, '2023-05')).toBe(true);
      expect(v.is(dateString, '2023-05-20')).toBe(true);
    });

    it('rejects invalid formats', () => {
      // Note: See critique below regarding your regex anchoring
      expect(v.is(dateString, 'abc')).toBe(false);
      expect(v.is(dateString, '202')).toBe(false); // Too short
    });

    it('transforms input by stripping "-00" suffixes', () => {
      // Logic inside v.transform must be verified
      expect(v.parse(dateString, '2023-00')).toBe('2023');
      expect(v.parse(dateString, '2023-05-00')).toBe('2023-05');
      expect(v.parse(dateString, '2023-00-00')).toBe('2023');
    });

    it('does not strip valid zeros', () => {
      expect(v.parse(dateString, '2020')).toBe('2020');
      expect(v.parse(dateString, '2023-10')).toBe('2023-10');
    });
  });

  describe('positivePercentage', () => {
    it('enforces boundaries [1, 100]', () => {
      expect(v.is(positivePercentage, 1)).toBe(true);
      expect(v.is(positivePercentage, 100)).toBe(true);

      expect(v.is(positivePercentage, 0)).toBe(false);
      expect(v.is(positivePercentage, 101)).toBe(false);
      expect(v.is(positivePercentage, -50)).toBe(false);
    });
  });

  describe('telegramPostSchema', () => {
    it('validates optional fields correctly', () => {
      const validNoImage: TelegramPost = { text: 'Hello' };
      const validWithImage: TelegramPost = {
        text: 'Hello',
        imageUrl: 'https://example.com/img.png',
      };

      expect(v.is(telegramPostSchema, validNoImage)).toBe(true);
      expect(v.is(telegramPostSchema, validWithImage)).toBe(true);
    });

    it('validates URL format if provided', () => {
      const invalidUrl = { text: 'Hello', imageUrl: 'not-a-url' };
      expect(v.is(telegramPostSchema, invalidUrl)).toBe(false);
    });
  });
});
