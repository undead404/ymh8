import { describe, expect, it, vi } from 'vitest';

import hideArtist from '../database2/hide-artist.js';
import kysely from '../database2/index.js';
import getAlbumStats from '../lastfm/get-album-stats.js';
import { ArtistNotFoundError } from '../lastfm/query.js';

import updateAlbumStats from './update-album-stats.js';

vi.mock('../database2/hide-artist.js', () => ({ default: vi.fn() }));
vi.mock('../database2/index.js', () => ({
  default: { transaction: vi.fn() },
}));
vi.mock('../lastfm/get-album-stats.js', () => ({ default: vi.fn() }));

describe('updateAlbumStats', () => {
  it('hides the artist and its albums for an artist-not-found response', async () => {
    const album = { artist: 'Laurel Zucker', name: 'Native American stories' };
    const transaction = {};
    const execute = vi.fn(async (callback: (value: unknown) => unknown) =>
      callback(transaction),
    );
    vi.mocked(kysely.transaction).mockReturnValue({ execute } as never);
    vi.mocked(getAlbumStats).mockRejectedValue(
      new ArtistNotFoundError('The artist you supplied could not be found'),
    );

    await expect(updateAlbumStats({ data: album } as never)).resolves.toEqual({
      status: 'artist_not_found_in_api',
    });
    expect(hideArtist).toHaveBeenCalledWith(transaction, album.artist);
  });
});
