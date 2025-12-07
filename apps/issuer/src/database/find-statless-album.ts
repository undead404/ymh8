import { type BareAlbum, bareAlbumSchema } from '@ymh8/schemata';

import database from './index.js';

export default function findStatlessAlbum(): Promise<null | BareAlbum> {
  const sql = `
    SELECT "artist", "name"
    FROM "Album"
    WHERE "statsUpdatedAt" IS NULL
    AND "hidden" <> TRUE
    ORDER BY "registeredAt" ASC
    LIMIT 1
  `;
  return database.queryOne(bareAlbumSchema, sql);
}
