import { describe, expect, it, vi } from 'vitest';

import queryLastfm, { InvalidAlbumNameError } from './query.js';

const logger = { log: vi.fn() };
const responseSchema = {
  kind: 'schema',
} as never;

describe('queryLastfm', () => {
  it('rejects album names containing control characters before making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      queryLastfm(
        responseSchema,
        { artist: 'Nirvana', album: '\u0001', method: 'album.getInfo' },
        logger,
      ),
    ).rejects.toBeInstanceOf(InvalidAlbumNameError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects Unicode C1 control characters as well', async () => {
    vi.stubGlobal('fetch', vi.fn());

    await expect(
      queryLastfm(
        responseSchema,
        { artist: 'Artist', album: 'Title\u0085', method: 'album.getInfo' },
        logger,
      ),
    ).rejects.toBeInstanceOf(InvalidAlbumNameError);
  });

  it('does not classify a provider HTTP 500 as an album-not-found response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html><h1>Internal Server Error</h1>', {
          status: 500,
          headers: { 'content-type': 'text/html' },
        }),
      ),
    );

    await expect(
      queryLastfm(
        responseSchema,
        { artist: 'Nirvana', album: 'Nevermind', method: 'album.getInfo' },
        logger,
      ),
    ).rejects.toThrow('Last.fm request failed with HTTP 500');
  });
});
