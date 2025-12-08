import SQL from '@nearform/sql';
import * as v from 'valibot';

import { bareAlbumSchema } from '@ymh8/schemata';
import database from '../database/index.js';
import readAlbumTags from '../database/read-album-tags.js';
import filterTags from '../filter-tags.js';
import getAlbumTags from '../lastfm/get-album-tags.js';
import getArtistTags from '../lastfm/get-artist-tags.js';
import normalizeTags from '../normalize-tags.js';
import sleep from '../utils/sleep.js';

export default async function updateAlbumTags(
  jobData: unknown,
): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, jobData);
  let tags = await getAlbumTags(bareAlbum);
  tags = normalizeTags(filterTags(tags));
  if (tags.length === 0) {
    await sleep(1100);
    tags = await getArtistTags(bareAlbum);
    tags = normalizeTags(filterTags(tags));
  }
  const oldTags = await readAlbumTags(bareAlbum);
  const tagsToRemove = oldTags.filter(
    (oldTag) => !tags.some(({ name }) => name === oldTag.tagName),
  );
  const tagsToUpdate = tags.filter((tag) => {
    const oldTag = oldTags.find((oldTag) => oldTag.tagName === tag.name);
    return !oldTag || oldTag.count !== tag.count;
  });

  if (tagsToRemove.length > 0) {
    const sql = SQL`
    DELETE FROM "AlbumTag"
    WHERE "albumArtist" = ${bareAlbum.artist}
    AND "albumName" = ${bareAlbum.name}
    AND "tagName" IN (${SQL.glue(
      tagsToRemove.map((tagToRemove) => SQL`${tagToRemove.tagName}`),
      ', ',
    )})
  `;
    console.log(sql);

    await database.update(sql);
  }

  for (const tag of tagsToUpdate) {
    await database.update(
      SQL`
        INSERT INTO "Tag"("name")
        VALUES (${tag.name})
        ON CONFLICT ("name") DO NOTHING;
    `,
      undefined,
      false,
    );
    await database.update(SQL`
        INSERT INTO "AlbumTag" (
          "albumArtist",
          "albumName",
          "tagName",
          "count"
        )
        VALUES (
          ${bareAlbum.artist},
          ${bareAlbum.name},
          ${tag.name},
          ${tag.count}
        )
        ON CONFLICT ("albumArtist", "albumName", "tagName")
        DO UPDATE
        SET "count" = ${tag.count}
    `);
  }
  await database.update(SQL`
    UPDATE "Album"
    SET "tagsUpdatedAt" = NOW()
    WHERE "artist" = ${bareAlbum.artist}
    AND "name" = ${bareAlbum.name}
  `);
  return Object.fromEntries(
    tagsToUpdate.map(({ name, count }) => [name, count]),
  );
}
