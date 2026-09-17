import { describe, expect, it, vi } from 'vitest';

import getAlbumDetails from '../database2/get-album-details.js';
import hideArtist from '../database2/hide-artist.js';
import kysely from '../database2/index.js';
import getAlbumTags from '../lastfm/get-album-tags.js';
import getArtistTags from '../lastfm/get-artist-tags.js';
import { ArtistNotFoundError } from '../lastfm/query.js';

import updateAlbumTags from './update-album-tags.js';

vi.mock('../database2/hide-artist.js', () => ({ default: vi.fn() }));
vi.mock('../database2/index.js', () => ({
  default: { transaction: vi.fn() },
}));
vi.mock('../database2/get-album-details.js', () => ({ default: vi.fn() }));
vi.mock('../lastfm/get-album-tags.js', () => ({ default: vi.fn() }));
vi.mock('../lastfm/get-artist-tags.js', () => ({ default: vi.fn() }));
vi.mock('@ymh8/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  sleep: vi.fn(),
}));

describe('updateAlbumTags', () => {
  it('hides the artist and its albums when artist tags are unavailable', async () => {
    const album = { artist: 'Laurel Zucker', name: 'Native American stories' };
    const builder = {
      executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
        listeners: null,
        playcount: null,
      }),
      select: vi.fn(),
      where: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.where.mockReturnValue(builder);
    const transaction = {
      selectFrom: vi.fn().mockReturnValue(builder),
    };
    const execute = vi.fn(async (callback: (value: unknown) => unknown) =>
      callback(transaction),
    );
    vi.mocked(kysely.transaction).mockReturnValue({ execute } as never);
    vi.mocked(getAlbumDetails).mockResolvedValue({
      date: null,
      numberOfTracks: null,
    });
    vi.mocked(getAlbumTags).mockResolvedValue([]);
    vi.mocked(getArtistTags).mockRejectedValue(
      new ArtistNotFoundError('The artist you supplied could not be found'),
    );

    await expect(updateAlbumTags({ data: album } as never)).resolves.toEqual({
      status: 'artist_not_found_in_api',
    });
    expect(hideArtist).toHaveBeenCalledWith(transaction, album.artist);
  });
});
