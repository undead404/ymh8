import { describe, expect, it, vi } from 'vitest';

import kysely from '../database2/index.js';
import saveArtistScrapeSuccess from '../database2/save-artist-scrape-success.js';

import finishArtistScrape from './finish-artist-scrape.js';

vi.mock('../database2/index.js', () => ({
  default: {
    transaction: vi.fn(),
  },
}));
vi.mock('../database2/save-artist-scrape-success.js', () => ({
  default: vi.fn(),
}));

describe('finishArtistScrape', () => {
  it('does not return the database result to BullMQ', async () => {
    const execute = vi.fn(
      async (callback: (transaction: unknown) => unknown) => {
        await callback({});
        return [{ numUpdatedRows: 1n }];
      },
    );
    vi.mocked(kysely.transaction).mockReturnValue({ execute } as never);

    await expect(
      finishArtistScrape({ data: { name: 'Mastodon' } } as never),
    ).resolves.toBeUndefined();
    expect(saveArtistScrapeSuccess).toHaveBeenCalledWith({}, 'Mastodon');
  });
});
