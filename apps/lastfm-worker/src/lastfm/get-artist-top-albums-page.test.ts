import { afterEach, describe, expect, it, vi } from 'vitest';

import getArtistTopAlbumsPage from './get-artist-top-albums-page.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getArtistTopAlbumsPage', () => {
  it('creates BullMQ-safe child job IDs for artist scrape operations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          topalbums: {
            '@attr': { page: '1', totalPages: '2' },
            album: [],
          },
        }),
      ),
    );

    const result = await getArtistTopAlbumsPage(
      { name: 'Mastodon' },
      { log: async () => undefined },
    );

    expect(result.childrenJobs).toHaveLength(1);
    expect(result.childrenJobs[0]?.opts?.jobId).not.toContain(':');
  });

  it('filters albums with empty metadata returned by Last.fm', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          topalbums: {
            album: [
              {
                artist: { name: 'Foster the People' },
                image: [],
                name: '',
                playcount: 100,
              },
              {
                artist: { name: 'Foster the People' },
                image: [],
                name: 'Torches',
                playcount: 100,
              },
            ],
          },
        }),
      ),
    );

    await expect(
      getArtistTopAlbumsPage(
        { name: 'Foster the People' },
        { log: async () => undefined },
      ),
    ).resolves.toEqual({
      albums: [
        {
          artist: 'Foster the People',
          cover: undefined,
          name: 'Torches',
          thumbnail: undefined,
        },
      ],
      childrenJobs: [],
    });
  });
});
