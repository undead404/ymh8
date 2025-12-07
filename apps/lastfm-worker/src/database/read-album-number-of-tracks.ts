import SQL from '@nearform/sql';
import * as v from 'valibot';

import type { BareAlbum } from '@ymh8/schemata';

import database from './index.js';

const numberOfTracksReturnSchema = v.object({
  numberOfTracks: v.nullable(v.number()),
});

export default async function readAlbumNumberOfTracks({
  artist,
  name,
}: BareAlbum): Promise<number | null> {
  const sql = SQL`
        SELECT "numberOfTracks"
        FROM "Album"
        WHERE "artist" = ${artist}
        AND "name" = ${name}
    `;
  const data = await database.queryOne(numberOfTracksReturnSchema, sql);
  if (!data) {
    throw new Error('Album numberOfTracks not found');
  }
  return data.numberOfTracks;
}
