import { type BareAlbum, bareAlbumSchema } from '@ymh8/schemata';

import database from './index.js';

export default function findTaglessAlbum(): Promise<null | BareAlbum> {
  const sql = `
    SELECT "artist", "name"
    FROM "Album"
    WHERE NOT EXISTS(
		SELECT 1 FROM "AlbumTag"
		WHERE "AlbumTag"."tagName" = "Album"."name"
	)
    AND "hidden" <> TRUE
    ORDER BY
		"tagsUpdatedAt" IS NULL DESC,
		"playcount" / 1000.0 * "listeners" DESC
    LIMIT 1
  `;
  return database.queryOne(bareAlbumSchema, sql);
}
