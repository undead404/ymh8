import SQL from '@nearform/sql';

import { enqueue, lastfmQueue } from '@ymh8/queues';
import { isAlbumNegligible } from '@ymh8/utils';

import database from './database/index.js';
import type convertAlbum from './utils/convert-album.js';

export default async function saveNewAlbums(
  newAlbums: ReturnType<typeof convertAlbum>[],
) {
  for (const newAlbum of newAlbums) {
    const isNegligible = isAlbumNegligible(newAlbum);
    const sql = SQL`
        INSERT INTO "Album" (
            "artist",
            "cover",
            "hidden",
            "name",
            "thumbnail"
        )
        VALUES (
            ${newAlbum.artist},
            ${newAlbum.cover ?? null},
            ${isNegligible},
            ${newAlbum.name},
            ${newAlbum.thumbnail ?? null}
        )
      `;
    await database.update(sql);
    if (!isNegligible) {
      await enqueue(
        lastfmQueue,
        'album:update:stats',
        newAlbum.artist + ' - ' + newAlbum.name,
        {
          artist: newAlbum.artist,
          name: newAlbum.name,
        },
        1,
      );
      await enqueue(
        lastfmQueue,
        'album:update:tags',
        newAlbum.artist + ' - ' + newAlbum.name,
        {
          artist: newAlbum.artist,
          name: newAlbum.name,
        },
        1,
      );
    }
  }
}
