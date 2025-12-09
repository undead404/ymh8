import SQL from '@nearform/sql';
import * as v from 'valibot';

import { isTagValid } from '@ymh8/database';
import { discogsQueue, enqueue } from '@ymh8/queues';
import {
  bareTagSchema,
  type TagListItem,
  tagListItemSchema,
} from '@ymh8/schemata';
import database from '../database/index.js';
import postToTelegram from '../telegram.js';
import escapeForTelegram from '../utils/escape-for-telegram.js';

const coverSchema = v.object({
  cover: v.optional(v.pipe(v.string(), v.url())),
});

export default async function generateTagList(
  jobData: unknown,
): Promise<unknown> {
  const bareTag = v.parse(bareTagSchema, jobData);
  if (!(await isTagValid(database, bareTag))) {
    await database.update(SQL`
        DELETE FROM "Tag"
        WHERE "name" = ${bareTag.name}
    `);
    return;
  }
  const sql = SQL`
    SELECT "artist" AS "albumArtist",
        "name" AS "albumName",
        (ROW_NUMBER() OVER (ORDER BY "weight" DESC))::INT AS "place"
    FROM (
        SELECT
            "Album"."artist",
            "Album"."name",
            (
                COALESCE("Album"."playcount", 0)::FLOAT
                / COALESCE(
                    CASE WHEN "Album"."numberOfTracks" = 0 THEN 1 ELSE "Album"."numberOfTracks" END,
                    (
                        SELECT AVG("numberOfTracks") FROM "Album" WHERE "numberOfTracks" IS NOT NULL
                    )
                )
                * COALESCE("Album"."listeners", 0)
                / COALESCE(
                    CASE WHEN "Album"."numberOfTracks" = 0 THEN 1 ELSE "Album"."numberOfTracks" END,
                    (
                        SELECT AVG("numberOfTracks") FROM "Album" WHERE "numberOfTracks" IS NOT NULL
                    )
                )
            )
            * "AlbumTag"."count"::FLOAT / 100
            AS "weight"
        FROM "AlbumTag"
        JOIN "Album"
        ON "Album"."artist" = "AlbumTag"."albumArtist"
        AND "Album"."name" = "AlbumTag"."albumName"
        WHERE "Album"."hidden" <> true
        AND "AlbumTag"."count" > 0
        AND "AlbumTag"."tagName" = ${bareTag.name}
        ORDER BY "weight" DESC
        LIMIT 100
    ) as X
  `;
  const tagListItems = await database.queryMany(tagListItemSchema, sql);
  if (tagListItems.length > 100) {
    throw new Error('Too many tag list items');
  }
  if (tagListItems.length < 100) {
    await database.update(SQL`
        UPDATE "Tag"
        SET
            "listCheckedAt" = NOW(),
            "listUpdatedAt" = NULL
        WHERE "name" = ${bareTag.name}
    `);
    return;
  }

  let changes: TagListItem[] = [];

  const oldList = await database.queryMany(
    tagListItemSchema,
    SQL`
        SELECT "albumArtist", "albumName", "place"
        FROM "TagListItem"
        WHERE "tagName" = ${bareTag.name}
        ORDER BY "place" ASC
    `,
  );
  if (oldList.length === 0) {
    await database.update(SQL`
        INSERT INTO "TagListItem" ("albumArtist", "albumName", "place", "tagName", "updatedAt")
        VALUES ${SQL.glue(
          tagListItems.map(
            ({ albumArtist, albumName, place }) =>
              SQL`(${albumArtist},${albumName},${place},${bareTag.name},NOW())`,
          ),
          ', ',
        )}
    `);
    changes = tagListItems;
  } else {
    for (const newListItem of tagListItems) {
      const oldListItem = oldList.find(
        ({ place }) => place === newListItem.place,
      );
      if (oldListItem) {
        if (
          newListItem.albumName !== oldListItem.albumName ||
          newListItem.albumArtist !== oldListItem.albumName
        ) {
          await database.update(SQL`
            UPDATE "TagListItem"
            SET
                "albumArtist" = ${newListItem.albumArtist},
                "albumName" = ${newListItem.albumName},
                "updatedAt" = NOW()
            WHERE "place" = ${newListItem.place}
            AND "tagName" = ${bareTag.name}
          `);
          changes.push(newListItem);
        }
      } else {
        await database.update(SQL`
            INSERT INTO "TagListItem" ("albumArtist", "albumName", "place", "tagName", "updatedAt")
            VALUES (${newListItem.albumArtist},${newListItem.albumName},${newListItem.place},${bareTag.name},NOW())
        `);
        changes.push(newListItem);
      }
    }
  }
  await database.update(
    changes.length === 0
      ? SQL`
        UPDATE "Tag"
        SET
            "listCheckedAt" = NOW()
        WHERE "name" = ${bareTag.name}
      `
      : SQL`
        UPDATE "Tag"
        SET
            "listCheckedAt" = NOW(),
            "listUpdatedAt" = NOW()
        WHERE "name" = ${bareTag.name}
      `,
  );
  for (const tagListItem of tagListItems) {
    await enqueue(
      discogsQueue,
      'album:enrich',
      `${tagListItem.albumArtist} - ${tagListItem.albumName}`,
      {
        artist: tagListItem.albumArtist,
        name: tagListItem.albumName,
      },
    );
  }

  const coverBearer = await database.queryOne(
    coverSchema,
    SQL`
        SELECT "Album"."cover"
        FROM "TagListItem"
        INNER JOIN "Album"
        ON "TagListItem"."albumArtist" = "Album"."artist"
        AND "TagListItem"."albumName" = "Album"."name"
        WHERE "TagListItem"."tagName" = ${bareTag.name}
        AND "Album"."cover" IS NOT NULL
        AND "Album"."cover" <> ''
        ORDER BY
            "TagListItem"."updatedAt" DESC,
            "TagListItem"."place" ASC
        LIMIT 1
    `,
  );

  await postToTelegram(
    `${oldList.length === 0 ? 'Новий' : 'Оновлений'} список для ${escapeForTelegram(bareTag.name)}:

${changes
  .slice(0, 10)
  .map(({ place, albumArtist, albumName }) =>
    escapeForTelegram(`#${place}. ${albumArtist} - ${albumName}`),
  )
  .join('\n')}`,
    coverBearer?.cover,
  );

  return changes;
}
