import SQL from '@nearform/sql';

import { bareTagSchema } from '@ymh8/schemata';

import database from './index.js';

export default async function readRelatedTags(tagName: string, max: number) {
  console.log(tagName + '...');
  const related = await database.queryMany(
    bareTagSchema,
    SQL`
        SELECT
            "second_tag"."tagName" AS "name",
            SUM(
                LEAST("first_tag"."count", "second_tag"."count")::FLOAT
                * COALESCE("Album"."listeners", 0)
            ) AS "weight"
        FROM "Album"
        INNER JOIN "AlbumTag"
        AS "first_tag"
        ON "Album"."artist" = "first_tag"."albumArtist"
        AND "Album"."name" = "first_tag"."albumName"
        LEFT JOIN "AlbumTag"
        AS "second_tag"
        ON "second_tag"."albumArtist" = "Album"."artist"
        AND "second_tag"."albumName" = "Album"."name"
        LEFT JOIN "Tag"
        AS "second_tag_tag"
        ON "second_tag_tag"."name" = "second_tag"."tagName"
        WHERE "first_tag"."tagName" = ${tagName}
        AND "second_tag_tag"."listUpdatedAt" IS NOT NULL
        AND "second_tag_tag"."name" <> ${tagName}
        GROUP BY "second_tag"."tagName"
        ORDER BY "weight" DESC
        LIMIT ${max}
    `,
  );
  console.log(`${tagName}: ${related.map(({ name }) => name).join(', ')}`);
  return related;
}
