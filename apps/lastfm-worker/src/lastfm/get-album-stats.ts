import * as v from 'valibot';

import type { BareAlbum } from '@ymh8/schemata';

import queryLastfm from './query.js';

const trackSchema = v.object({
  duration: v.nullable(v.number()),
});

const statsResponseSchema = v.object({
  album: v.object({
    listeners: v.pipe(v.string(), v.toNumber()),
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

export default async function getAlbumStats({ artist, name }: BareAlbum) {
  const statsResponse = await queryLastfm(statsResponseSchema, {
    album: name,
    artist,
    method: 'album.getInfo',
  });
  return {
    listeners: statsResponse.album.listeners,
    numberOfTracks: statsResponse.album.tracks?.track.filter(
      ({ duration }) => duration && duration >= 30,
    ).length,
    playcount: statsResponse.album.playcount,
  };
}
