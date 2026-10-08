import * as v from 'valibot';

import {
  type AsyncLogger,
  type BareAlbum,
  nonEmptyString,
} from '@ymh8/schemata';

import queryLastfm from './query.js';

const trackSchema = v.object({
  duration: v.nullable(v.number()),
});

const statsResponseSchema = v.object({
  album: v.object({
    artist: nonEmptyString,
    listeners: v.pipe(v.string(), v.toNumber()),
    name: v.string(),
    playcount: v.pipe(v.string(), v.toNumber()),
    tracks: v.optional(
      v.object({
        track: v.pipe(
          v.union([v.array(trackSchema), trackSchema]),
          v.transform((trackData) =>
            Array.isArray(trackData) ? trackData : [trackData],
          ),
        ),
      }),
    ),
  }),
});

export default async function getAlbumStats(
  { artist, name }: BareAlbum,
  logger: AsyncLogger,
) {
  const statsResponse = await queryLastfm(
    statsResponseSchema,
    {
      album: name,
      artist,
      method: 'album.getInfo',
    },
    logger,
  );
  return {
    artist: statsResponse.album.artist,
    listeners: statsResponse.album.listeners,
    name: statsResponse.album.name,
    numberOfTracks: statsResponse.album.tracks?.track.filter(
      ({ duration }) => duration && duration >= 30,
    ).length,
    playcount: statsResponse.album.playcount,
  };
}
