import { readFile } from 'node:fs/promises';

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import loadList from './load-list.js'; // Adjust path as needed

// Mock the filesystem module
vi.mock('node:fs/promises');

describe('loadList', () => {
  // clear mocks before each test to prevent state bleeding
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly parses a valid file, stripping comments and empty lines', async () => {
    const mockContent = `
      item1
      item2 
      # This is a comment
      
      item3   
    `;

    // Mock successful file read
    (readFile as Mock).mockResolvedValue(mockContent);

    const result = await loadList('test.txt');

    // Expected: Trims whitespace, removes empty lines, removes lines starting with #
    expect(result).toEqual(['item1', 'item2', 'item3']);
    expect(readFile).toHaveBeenCalledWith(
      expect.stringContaining('test.txt'),
      'utf8',
    );
  });

  it('returns an empty array if the file is empty', async () => {
    (readFile as Mock).mockResolvedValue('');

    const result = await loadList('empty.txt');

    expect(result).toEqual([]);
  });

  it('returns an empty array if the file contains only comments and whitespace', async () => {
    const mockContent = `
      # comment 1
           
      # comment 2
    `;
    (readFile as Mock).mockResolvedValue(mockContent);

    const result = await loadList('comments.txt');

    expect(result).toEqual([]);
  });

  it('handles filesystem errors by throwing', async () => {
    // Spy on console.error to suppress output during test and verify it was called
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Force readFile to throw an error (e.g., ENOENT)
    (readFile as Mock).mockRejectedValue(new Error('File not found'));

    await expect(loadList('missing.txt')).rejects.toThrow(
      'Failed to load required list missing.txt: File not found',
    );

    // Restore console to original state
    consoleSpy.mockRestore();
  });
});
