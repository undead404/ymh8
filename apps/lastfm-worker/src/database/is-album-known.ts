import SQL from '@nearform/sql';

import type { BareAlbum } from '@ymh8/schemata';

import database from './index.js';

export default async function isAlbumKnown(album: BareAlbum) {
  const sql = SQL`
    SELECT "artist", "name"
    FROM "Album"
    WHERE "artist" = ${album.artist}
    AND "name" = ${album.name}
    LIMIT 1
  `;
  const count = await database.count(sql);
  return count > 0;
}
