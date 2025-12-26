import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = '.';
/**
 * Helper to read a file and split into a clean array.
 * Returns empty array on error to prevent app crash.
 */
export default async function loadList(filename: string): Promise<string[]> {
  try {
    const content = await readFile(path.join(DATA_DIR, filename), 'utf8');
    return content
      .split('\n')
      .filter((line) => line.length > 0 && !line.startsWith('#')); // Support comments
  } catch (error) {
    throw new Error(
      `Failed to load required list ${filename}: ${(error as Error).message}`,
    );
  }
}
