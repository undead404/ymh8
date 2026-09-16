import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import getArtistsToScrape from '../../database2/get-artists-to-scrape.js';
import getOldStatsAlbums from '../../database2/get-old-stats-albums.js';
import getOldTagsAlbums from '../../database2/get-old-tags-albums.js';
import getTagsToScrape from '../../database2/get-tags-to-scrape.js';

import addLastfmWork from './lastfm.js';

vi.mock('../../database2/get-old-stats-albums.js', () => ({
  default: vi.fn(),
}));
vi.mock('../../database2/get-old-tags-albums.js', () => ({
  default: vi.fn(),
}));
vi.mock('../../database2/get-artists-to-scrape.js', () => ({
  default: vi.fn(),
}));
vi.mock('../../database2/get-tags-to-scrape.js', () => ({
  default: vi.fn(),
}));

const transaction = {} as Transaction<DB>;

describe('addLastfmWork', () => {
  beforeEach(() => {
    vi.mocked(getOldStatsAlbums).mockReset();
    vi.mocked(getOldTagsAlbums).mockReset();
    vi.mocked(getArtistsToScrape).mockReset();
    vi.mocked(getTagsToScrape).mockReset();
  });

  it('creates safe IDs from colon-containing album and tag values', async () => {
    const statsAlbum = {
      artist: 'Artist:One',
      date: null,
      name: 'Album:One',
    };
    const tagsAlbum = {
      artist: 'Artist:Two',
      date: null,
      name: 'Album:Two',
    };
    const tag = { name: 'tag:one' };
    const artist = { name: 'Artist:Three' };
    vi.mocked(getOldStatsAlbums).mockResolvedValue([statsAlbum]);
    vi.mocked(getOldTagsAlbums).mockResolvedValue([tagsAlbum]);
    vi.mocked(getTagsToScrape).mockResolvedValue([tag]);
    vi.mocked(getArtistsToScrape).mockResolvedValue([artist]);

    const jobs = await addLastfmWork(transaction, 4);

    expect(jobs).toHaveLength(4);
    expect(jobs.map(({ name }) => name)).toEqual([
      'album:update:stats',
      'album:update:tags',
      'tag:scrape',
      'artist:scrape',
    ]);
    expect(jobs.every(({ opts }) => !opts?.jobId?.includes(':'))).toBe(true);
    expect(jobs[0]?.data).toBe(statsAlbum);
    expect(jobs[1]?.data).toBe(tagsAlbum);
    expect(jobs[2]?.data).toBe(tag);
    expect(jobs[3]?.data).toBe(artist);
    expect(jobs[0]?.opts?.priority).toBe(1);
    expect(jobs[1]?.opts?.priority).toBe(1);
    expect(jobs[2]?.opts?.priority).toBeUndefined();
    expect(jobs[3]?.opts?.priority).toBeUndefined();
  });

  it('returns no work when capacity is exhausted', async () => {
    await expect(addLastfmWork(transaction, 0)).resolves.toEqual([]);
    expect(getOldStatsAlbums).not.toHaveBeenCalled();
    expect(getOldTagsAlbums).not.toHaveBeenCalled();
    expect(getArtistsToScrape).not.toHaveBeenCalled();
    expect(getTagsToScrape).not.toHaveBeenCalled();
  });
});
