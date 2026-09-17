import * as v from 'valibot';

import { type AsyncLogger, nonEmptyString } from '@ymh8/schemata';
import { environment } from '../environment.js';

const errorResponseSchema = v.object({
  error: v.number(),
  message: nonEmptyString,
});

export class ArtistNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtistNotFoundError';
  }
}

export class AlbumNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlbumNotFoundError';
  }
}

export class InvalidAlbumNameError extends Error {
  constructor() {
    super('Album name contains control characters');
    this.name = 'InvalidAlbumNameError';
  }
}

export default async function queryLastfm<T1, T2 extends { method: string }>(
  schema: v.BaseSchema<unknown, T1, v.BaseIssue<unknown>>,
  parameters: T2,
  logger: AsyncLogger,
): Promise<T1> {
  if (
    parameters.method.startsWith('album') &&
    'album' in parameters &&
    typeof parameters.album === 'string' &&
    /\p{Cc}/u.test(parameters.album)
  ) {
    throw new InvalidAlbumNameError();
  }

  const url =
    'https://ws.audioscrobbler.com/2.0/?' +
    new URLSearchParams({
      api_key: environment.LASTFM_API_KEY,
      autocorrect: '0',
      format: 'json',
      ...parameters,
    }).toString();
  await logger.log(url);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(60_000),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    if (response.status === 404 && parameters.method.startsWith('album')) {
      throw new AlbumNotFoundError('Album not found in Last.fm');
    }
    throw new Error(`Last.fm request failed with HTTP ${response.status}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(responseBody);
  } catch {
    throw new Error(
      `Last.fm returned a non-JSON response (HTTP ${response.status})`,
    );
  }
  // console.log(data);
  try {
    return v.parse(schema, data);
  } catch (error) {
    const result = v.safeParse(errorResponseSchema, data);
    if (!result.success) {
      throw error;
    }
    if (parameters.method.startsWith('artist') && result.output.error === 6) {
      throw new ArtistNotFoundError(result.output.message);
    }
    if (parameters.method.startsWith('album') && result.output.error === 6) {
      throw new AlbumNotFoundError(result.output.message);
    }
    if (result.output.message) {
      throw new Error(result.output.message);
    }
    throw error;
  }
}
