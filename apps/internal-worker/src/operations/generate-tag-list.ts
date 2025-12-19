import crypto from 'node:crypto';

import { v4 as uuidv4 } from 'uuid';
import * as v from 'valibot';

import { deleteTag, hideAlbum, isTagValid2 } from '@ymh8/database';
import {
  discogsQueue,
  enqueue,
  internalQueue,
  telegramQueue,
} from '@ymh8/queues';
import {
  bareTagSchema,
  // tagListItemSchema,
  type TelegramPost,
} from '@ymh8/schemata';
import { escapeForTelegram, isAlbumNegligible } from '@ymh8/utils';
import getNewTagListItems from '../database2/get-new-tag-list-items.js';
import getOldList from '../database2/get-old-list.js';
import getRecentTagCover from '../database2/get-recent-tag-cover.js';
import kysely from '../database2/index.js';
import type { TagListItemUpdate } from '../database2/insert-new-list-items.js';
import insertNewListItems from '../database2/insert-new-list-items.js';
import saveEmptyResult from '../database2/save-empty-result.js';
import saveNoListChange from '../database2/save-no-list-change.js';
import saveTagListSuccess from '../database2/save-tag-list-success.js';
import updateTagListItem from '../database2/update-tag-list-item.js';

export default async function generateTagList(
  jobData: unknown,
): Promise<unknown> {
  const bareTag = v.parse(bareTagSchema, jobData);
  return kysely.transaction().execute(async (trx) => {
    // if (!(await isTagValid(database, bareTag))) {
    if (!(await isTagValid2(trx, bareTag))) {
      // await database.update(SQL`
      //     DELETE FROM "Tag"
      //     WHERE "name" = ${bareTag.name}
      // `);
      await deleteTag(trx, bareTag.name);
      return;
    }
    // const sql = SQL`
    //   SELECT "artist" AS "albumArtist",
    //       "name" AS "albumName",
    //       (ROW_NUMBER() OVER (ORDER BY "weight" DESC))::INT AS "place"
    //   FROM (
    //       SELECT
    //           "Album"."artist",
    //           "Album"."name",
    //           (
    //               COALESCE("Album"."playcount", 0)::FLOAT
    //               / COALESCE(
    //                   CASE WHEN "Album"."numberOfTracks" = 0 THEN 1 ELSE "Album"."numberOfTracks" END,
    //                   (
    //                       SELECT AVG("numberOfTracks") FROM "Album" WHERE "numberOfTracks" IS NOT NULL
    //                   )
    //               )
    //               * COALESCE("Album"."listeners", 0)
    //               / COALESCE(
    //                   CASE WHEN "Album"."numberOfTracks" = 0 THEN 1 ELSE "Album"."numberOfTracks" END,
    //                   (
    //                       SELECT AVG("numberOfTracks") FROM "Album" WHERE "numberOfTracks" IS NOT NULL
    //                   )
    //               )
    //           )
    //           * "AlbumTag"."count"::FLOAT / 100
    //           AS "weight"
    //       FROM "AlbumTag"
    //       JOIN "Album"
    //       ON "Album"."artist" = "AlbumTag"."albumArtist"
    //       AND "Album"."name" = "AlbumTag"."albumName"
    //       WHERE "Album"."hidden" IS NOT TRUE
    //       AND "AlbumTag"."count" > 0
    //       AND "AlbumTag"."tagName" = ${bareTag.name}
    //       ORDER BY "weight" DESC
    //       LIMIT 100
    //   ) as X
    // `;
    // const tagListItems = await database.queryMany(tagListItemSchema, sql);
    const tagListItems = await getNewTagListItems(trx, bareTag.name);
    if (tagListItems.length > 100) {
      throw new Error('Too many tag list items');
    }
    if (tagListItems.length < 100) {
      // await database.update(SQL`
      //     UPDATE "Tag"
      //     SET
      //         "listCheckedAt" = NOW(),
      //         "listUpdatedAt" = NULL
      //     WHERE "name" = ${bareTag.name}
      // `);
      await saveEmptyResult(trx, bareTag.name);
      return;
    }
    let shouldRestart = false;
    for (const tagListItem of tagListItems) {
      if (
        isAlbumNegligible({
          artist: tagListItem.albumArtist,
          name: tagListItem.albumName,
        })
      ) {
        shouldRestart = true;
        // await database.update(SQL`
        //   UPDATE "Album"
        //   SET "hidden" = TRUE
        //   WHERE "artist" = ${tagListItem.albumArtist}
        //   AND "name" = ${tagListItem.albumName}
        // `);
        await hideAlbum(trx, {
          artist: tagListItem.albumArtist,
          name: tagListItem.albumName,
        });
      }
    }
    if (shouldRestart) {
      await enqueue(
        internalQueue,
        'tag:list:generate',
        bareTag.name +
          '-' +
          crypto.createHash('md5').update(new Date().toString()).digest('hex'),
        bareTag,
        100,
      );
      return;
    }

    let changes: TagListItemUpdate[] = [];

    // const oldList = await database.queryMany(
    //   tagListItemSchema,
    //   SQL`
    //       SELECT "albumArtist", "albumName", "place"
    //       FROM "TagListItem"
    //       WHERE "tagName" = ${bareTag.name}
    //       ORDER BY "place" ASC
    //   `,
    // );
    const oldList = await getOldList(trx, bareTag.name);
    if (oldList.length === 0) {
      // await database.update(SQL`
      //     INSERT INTO "TagListItem" ("albumArtist", "albumName", "place", "tagName", "updatedAt")
      //     VALUES ${SQL.glue(
      //       tagListItems.map(
      //         ({ albumArtist, albumName, place }) =>
      //           SQL`(${albumArtist},${albumName},${place},${bareTag.name},NOW())`,
      //       ),
      //       ', ',
      //     )}
      // `);
      await insertNewListItems(trx, bareTag.name, tagListItems);
      changes = tagListItems;
    } else {
      for (const newListItem of tagListItems) {
        const oldListItem = oldList.find(
          ({ place }) => place === newListItem.place,
        );
        if (oldListItem) {
          if (
            newListItem.albumName !== oldListItem.albumName ||
            newListItem.albumArtist !== oldListItem.albumArtist
          ) {
            // await database.update(SQL`
            //   UPDATE "TagListItem"
            //   SET
            //       "albumArtist" = ${newListItem.albumArtist},
            //       "albumName" = ${newListItem.albumName},
            //       "updatedAt" = NOW()
            //   WHERE "place" = ${newListItem.place}
            //   AND "tagName" = ${bareTag.name}
            // `);
            await updateTagListItem(trx, bareTag.name, newListItem);
            changes.push(newListItem);
          }
        } else {
          // await database.update(SQL`
          //     INSERT INTO "TagListItem" ("albumArtist", "albumName", "place", "tagName", "updatedAt")
          //     VALUES (${newListItem.albumArtist},${newListItem.albumName},${newListItem.place},${bareTag.name},NOW())
          // `);
          await insertNewListItems(trx, bareTag.name, [newListItem]);
          changes.push(newListItem);
        }
      }
    }
    if (changes.length === 0) {
      await saveNoListChange(trx, bareTag.name);
      return;
    }
    await saveTagListSuccess(trx, bareTag.name);
    // await database.update(
    //   changes.length === 0
    //     ? SQL`
    //       UPDATE "Tag"
    //       SET
    //           "listCheckedAt" = NOW()
    //       WHERE "name" = ${bareTag.name}
    //     `
    //     : SQL`
    //       UPDATE "Tag"
    //       SET
    //           "listCheckedAt" = NOW(),
    //           "listUpdatedAt" = NOW()
    //       WHERE "name" = ${bareTag.name}
    //     `,
    // );
    for (const tagListItem of changes) {
      await enqueue(
        discogsQueue,
        'album:enrich',
        `${tagListItem.albumArtist} - ${tagListItem.albumName}`,
        {
          artist: tagListItem.albumArtist,
          name: tagListItem.albumName,
        },
        1,
      );
    }

    // const coverBearer = await database.queryOne(
    //   coverSchema,
    //   SQL`
    //       SELECT "Album"."cover"
    //       FROM "TagListItem"
    //       INNER JOIN "Album"
    //       ON "TagListItem"."albumArtist" = "Album"."artist"
    //       AND "TagListItem"."albumName" = "Album"."name"
    //       WHERE "TagListItem"."tagName" = ${bareTag.name}
    //       AND "Album"."cover" IS NOT NULL
    //       AND "Album"."cover" <> ''
    //       ORDER BY
    //           "TagListItem"."updatedAt" DESC,
    //           "TagListItem"."place" ASC
    //       LIMIT 1
    //   `,
    // );
    const cover = await getRecentTagCover(trx, bareTag.name);

    await enqueue(
      telegramQueue,
      'post',
      'list-' + escapeForTelegram(bareTag.name) + '-' + uuidv4(),
      {
        imageUrl: cover,
        text: `${oldList.length === 0 ? 'Новий' : 'Оновлений'} список для ${escapeForTelegram(bareTag.name)}:

${changes
  .slice(0, 10)
  .map(({ place, albumArtist, albumName }) =>
    escapeForTelegram(`#${place}. ${albumArtist} - ${albumName}`),
  )
  .join('\n')}`,
      } satisfies TelegramPost,
      100,
    );

    return changes;
  });
}
