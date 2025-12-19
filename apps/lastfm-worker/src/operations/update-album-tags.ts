import * as v from 'valibot';

import { bareAlbumSchema } from '@ymh8/schemata';
import { sleep } from '@ymh8/utils';
import kysely from '../database2/index.js';
import readAlbumTags from '../database2/read-album-tags.js';
import removeTagsFromAlbum from '../database2/remove-tags-from-album.js';
import saveAlbumTagsUpdateSuccess from '../database2/save-album-tags-update-success.js';
import upsertAlbumTags from '../database2/upsert-album-tags.js';
import upsertTags from '../database2/upsert-tags.js';
import filterTags from '../filter-tags.js';
import getAlbumTags from '../lastfm/get-album-tags.js';
import getArtistTags from '../lastfm/get-artist-tags.js';
import normalizeTags from '../normalize-tags.js';

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
  return kysely.transaction().execute(async (transaction) => {
    const oldTags = await readAlbumTags(transaction, bareAlbum);
    // const oldTags = await readAlbumTags(bareAlbum);
    const tagsToRemove = oldTags.filter(
      (oldTag) => !tags.some(({ name }) => name === oldTag.tagName),
    );
    const tagsToUpdate = tags.filter((tag) => {
      const oldTag = oldTags.find((oldTag) => oldTag.tagName === tag.name);
      return !oldTag || oldTag.count !== tag.count;
    });

    if (tagsToRemove.length > 0) {
      //   const sql = SQL`
      // DELETE FROM "AlbumTag"
      // WHERE "albumArtist" = ${bareAlbum.artist}
      // AND "albumName" = ${bareAlbum.name}
      // AND "tagName" IN (${SQL.glue(
      //   tagsToRemove.map((tagToRemove) => SQL`${tagToRemove.tagName}`),
      //   ', ',
      // )})
      // `;
      // console.log(sql);

      // await database.update(sql);
      await removeTagsFromAlbum(
        transaction,
        bareAlbum,
        tagsToRemove.map((tag) => tag.tagName),
      );
    }
    if (tagsToUpdate.length > 0) {
      await upsertTags(
        transaction,
        tagsToUpdate.map(({ name }) => ({ name })),
      );
      await upsertAlbumTags(transaction, bareAlbum, tagsToUpdate);
    }

    // for (const tag of tagsToUpdate) {
    //   await database.update(
    //     SQL`
    //     INSERT INTO "Tag"("name")
    //     VALUES (${tag.name})
    //     ON CONFLICT ("name") DO NOTHING;
    // `,
    //     undefined,
    //     false,
    //   );
    //   await database.update(SQL`
    //     INSERT INTO "AlbumTag" (
    //       "albumArtist",
    //       "albumName",
    //       "tagName",
    //       "count"
    //     )
    //     VALUES (
    //       ${bareAlbum.artist},
    //       ${bareAlbum.name},
    //       ${tag.name},
    //       ${tag.count}
    //     )
    //     ON CONFLICT ("albumArtist", "albumName", "tagName")
    //     DO UPDATE
    //     SET "count" = ${tag.count}
    // `);
    // }
    //   await database.update(SQL`
    //   UPDATE "Album"
    //   SET "tagsUpdatedAt" = NOW()
    //   WHERE "artist" = ${bareAlbum.artist}
    //   AND "name" = ${bareAlbum.name}
    // `);
    await saveAlbumTagsUpdateSuccess(transaction, bareAlbum);
    return Object.fromEntries(
      tagsToUpdate.map(({ name, count }) => [name, count]),
    );
  });
}
