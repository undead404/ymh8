import { type BareAlbum, bareAlbumSchema } from '@ymh8/schemata';

import database from './index.js';

export default function findOldStatsBareAlbum(): Promise<null | BareAlbum> {
  const sql = `
        SELECT "artist", "name"
        FROM "Album"
        WHERE "hidden" <> TRUE
        ORDER BY "statsUpdatedAt" ASC
        LIMIT 1
    `;
  return database.queryOne(bareAlbumSchema, sql);
}
