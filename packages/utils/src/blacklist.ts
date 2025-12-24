import loadList from './utils/load-list.js';

// Configuration
const MAX_TAG_LENGTH = 40;
const MIN_TAG_LENGTH = 2;

// Standardized formatting regex (e.g. alphanumeric + dashes)
const FORMAT_RE = /^\w[-\d A-Z_]*[a-z][-\w ]*\w$/;

export interface TagBlacklist {
  isBlacklisted: (tagName: string) => boolean;
  reload: () => Promise<void>;
}

// Escape special regex characters in user input to prevent crashes
const escape = (s: string) =>
  s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Factory function to create the validator.
 * Initializes data asynchronously without blocking the module system.
 */
export async function createTagBlacklist(): Promise<TagBlacklist> {
  let exactSet: Set<string>;
  let startRe: RegExp;
  let endRe: RegExp;
  let subRe: RegExp;

  async function loadData() {
    // 1. Parallel I/O: Load all files simultaneously
    const [exact, starts, ends, subs] = await Promise.all([
      loadList('blacklist-exact.txt'),
      loadList('blacklist-starts.txt'),
      loadList('blacklist-ends.txt'),
      loadList('blacklist-substrings.txt'),
    ]);

    // 2. Runtime Compilation: Convert lists to optimized structures

    exactSet = new Set(exact.map((s) => s.toLowerCase()));

    // Create one optimized Regex per list instead of looping .some() arrays
    // This is invisible to you (data is text) but makes the CPU happy.
    startRe =
      starts.length > 0
        ? new RegExp(`^(${starts.map((item) => escape(item)).join('|')})`, 'i')
        : /$^/;
    endRe =
      ends.length > 0
        ? new RegExp(`(${ends.map((item) => escape(item)).join('|')})$`, 'i')
        : /$^/;
    subRe =
      subs.length > 0
        ? new RegExp(`(${subs.map((item) => escape(item)).join('|')})`, 'i')
        : /$^/;
  }

  // Initial load
  await loadData();

  return {
    reload: loadData,
    isBlacklisted: (tagName: string): boolean => {
      // 1. Cheap checks first
      if (
        !tagName ||
        tagName.length < MIN_TAG_LENGTH ||
        tagName.length > MAX_TAG_LENGTH
      ) {
        return true;
      }

      // 2. Regex format check
      if (!FORMAT_RE.test(tagName)) {
        return true;
      }

      const normalized = tagName.toLowerCase();

      // 3. Exact Match (O(1) lookup)
      if (exactSet.has(normalized)) return true;

      // 4. Pattern Matches (Compiled Regex State Machine)
      // Much faster than array.some(str => tagName.includes(str))
      if (startRe.test(tagName)) return true;
      if (endRe.test(tagName)) return true;
      if (subRe.test(tagName)) return true;

      return false;
    },
  };
}
