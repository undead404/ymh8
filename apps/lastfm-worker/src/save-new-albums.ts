import SQL from '@nearform/sql';

import { enqueue, lastfmQueue } from '@ymh8/queues';

import database from './database/index.js';
import type convertAlbum from './utils/convert-album.js';

export default async function saveNewAlbums(
  newAlbums: ReturnType<typeof convertAlbum>[],
) {
  for (const newAlbum of newAlbums) {
    const sql = SQL`
        INSERT INTO "Album" (
            "artist",
            "cover",
            "name",
            "thumbnail"
        )
        VALUES (
            ${newAlbum.artist},
            ${newAlbum.cover ?? null},
            ${newAlbum.name},
            ${newAlbum.thumbnail ?? null}
        )
      `;
    await database.update(sql);

    await enqueue(
      lastfmQueue,
      'album:update:stats',
      newAlbum.artist + ' - ' + newAlbum.name,
      {
        artist: newAlbum.artist,
        name: newAlbum.name,
      },
    );
    await enqueue(
      lastfmQueue,
      'album:update:tags',
      newAlbum.artist + ' - ' + newAlbum.name,
      {
        artist: newAlbum.artist,
        name: newAlbum.name,
      },
    );
  }
}
