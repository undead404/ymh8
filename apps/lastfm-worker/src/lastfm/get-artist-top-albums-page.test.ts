import { describe, expect, it, vi } from 'vitest';

import getArtistTopAlbumsPage from './get-artist-top-albums-page.js';
import queryLastfm from './query.js';

vi.mock('./query.js', () => ({
  default: vi.fn(),
}));

describe('getArtistTopAlbumsPage', () => {
  it('creates BullMQ-safe child job IDs for artist scrape operations', async () => {
    vi.mocked(queryLastfm).mockResolvedValue({
      topalbums: {
        '@attr': { page: '1', totalPages: '2' },
        album: [],
      },
    });

    const result = await getArtistTopAlbumsPage(
      { name: 'Mastodon' },
      { log: async () => undefined },
    );

    expect(result.childrenJobs).toHaveLength(1);
    expect(result.childrenJobs[0]?.opts?.jobId).not.toContain(':');
  });
});
