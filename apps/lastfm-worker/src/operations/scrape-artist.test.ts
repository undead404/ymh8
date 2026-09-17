import { describe, expect, it, vi } from 'vitest';

import hideArtist from '../database2/hide-artist.js';
import kysely from '../database2/index.js';
import getArtistTopAlbumsPage from '../lastfm/get-artist-top-albums-page.js';
import { ArtistNotFoundError } from '../lastfm/query.js';

import scrapeArtist from './scrape-artist.js';

vi.mock('../database2/hide-artist.js', () => ({ default: vi.fn() }));
vi.mock('../database2/index.js', () => ({
  default: { transaction: vi.fn() },
}));
vi.mock('../lastfm/get-artist-top-albums-page.js', () => ({
  default: vi.fn(),
}));

describe('scrapeArtist', () => {
  it('hides the artist and its albums when Last.fm cannot find the artist', async () => {
    const artistName = String.raw`Axwell /\ Ingrosso`;
    vi.mocked(getArtistTopAlbumsPage).mockRejectedValue(
      new ArtistNotFoundError('The artist you supplied could not be found'),
    );
    const execute = vi.fn(async (callback: (transaction: unknown) => unknown) =>
      callback({}),
    );
    vi.mocked(kysely.transaction).mockReturnValue({ execute } as never);
    const log = vi.fn();

    await expect(
      scrapeArtist({ data: { name: artistName }, log } as never),
    ).resolves.toEqual([]);

    expect(hideArtist).toHaveBeenCalledWith({}, artistName);
    expect(log).toHaveBeenCalledWith(
      `Artist ${artistName} was not found on Last.fm and was hidden`,
    );
  });

  it('rethrows other Last.fm failures', async () => {
    const error = new Error('temporary failure');
    vi.mocked(getArtistTopAlbumsPage).mockRejectedValue(error);

    await expect(
      scrapeArtist({ data: { name: 'Mastodon' } } as never),
    ).rejects.toBe(error);
  });
});
