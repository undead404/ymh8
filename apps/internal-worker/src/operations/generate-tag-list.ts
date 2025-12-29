import crypto from 'node:crypto';

import type { Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import * as v from 'valibot';

import { deleteTag, hideAlbum, isTagValid } from '@ymh8/database';
import {
  discogsQueue,
  enqueue,
  internalQueue,
  telegramQueue,
} from '@ymh8/queues';
import { bareTagSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram, isAlbumNegligible } from '@ymh8/utils';
import getNewTagListItems from '../database2/get-new-tag-list-items.js';
import getOldList from '../database2/get-old-list.js';
import getRecentTagCover from '../database2/get-recent-tag-cover.js';
import kysely from '../database2/index.js';
import insertNewListItems from '../database2/insert-new-list-items.js';
import saveEmptyResult from '../database2/save-empty-result.js';
import saveNoListChange from '../database2/save-no-list-change.js';
import saveTagListSuccess from '../database2/save-tag-list-success.js';
import updateTagListItem from '../database2/update-tag-list-item.js';
import compareOldNewList from '../utils/compare-old-new-list.js';

export default async function generateTagList(
  job: Job<unknown>,
): Promise<unknown> {
  const bareTag = v.parse(bareTagSchema, job.data);

  return kysely.transaction().execute(async (trx) => {
    // --- VALIDATION & CLEANUP (Standard Logic) ---
    if (!(await isTagValid(trx, bareTag))) {
      await deleteTag(trx, bareTag.name);
      return { status: 'deleted' };
    }

    const tagListItems = await getNewTagListItems(trx, bareTag.name);
    if (tagListItems.length > 100) throw new Error('Too many tag list items');
    if (tagListItems.length < 100) {
      await saveEmptyResult(trx, bareTag.name);
      return { status: 'insufficient_items' };
    }

    // Fix: Batch hide negligible items to prevent restart loops
    const negligible = tagListItems.filter((index) =>
      isAlbumNegligible({ artist: index.albumArtist, name: index.albumName }),
    );
    if (negligible.length > 0) {
      await job.log(`${negligible.length} negligible albums found`);
      await Promise.all(
        negligible.map((index) =>
          hideAlbum(trx, { artist: index.albumArtist, name: index.albumName }),
        ),
      );
      await enqueue(
        internalQueue,
        'tag:list:generate',
        `${bareTag.name}-${crypto.randomUUID()}`,
        bareTag,
        100,
      );
      return { status: 'restarting' };
    }

    // --- DB SYNC LOGIC ---
    const oldList = await getOldList(trx, bareTag.name);

    const { changeList, toEnrich, toInsert, toUpdate } = compareOldNewList(
      oldList,
      tagListItems,
    );
    const hasDatabaseChanges = toInsert.length > 0 || toUpdate.length > 0;

    if (!hasDatabaseChanges) {
      await saveNoListChange(trx, bareTag.name);
      return { status: 'no_change' };
    }

    if (toInsert.length > 0) {
      await insertNewListItems(trx, bareTag.name, toInsert);
    }
    for (const itemToUpdate of toUpdate) {
      await updateTagListItem(trx, bareTag.name, itemToUpdate);
    }

    await saveTagListSuccess(trx, bareTag.name);

    // --- ENRICHMENT QUEUE (Only for truly new albums) ---

    if (toEnrich.length > 0) {
      await Promise.all(
        toEnrich.map((item) =>
          enqueue(
            discogsQueue,
            'album:enrich',
            `${item.albumArtist} - ${item.albumName}`,
            { artist: item.albumArtist, name: item.albumName },
            1,
          ),
        ),
      );
    }

    // --- SMART DIFF TELEGRAM LOGIC ---

    // Build the output lines
    const lines: string[] = [];

    for (const changeListRecord of changeList) {
      if (typeof changeListRecord === 'string') {
        lines.push(changeListRecord);
        continue;
      }
      const [marker, place, albumSig] = changeListRecord;
      lines.push(`${marker} <b>${place}</b> ${escapeForTelegram(albumSig)}`);
    }

    let text = `${oldList.length === 0 ? '🆕 Новий' : '🔄 Оновлений'} список для ${escapeForTelegram(bareTag.name)}:

`;

    for (const line of lines) {
      const nextText = `${text}\n${line}`;
      if (nextText.length > 4090) {
        text = `${text}\n…`;

        break;
      }
      text = nextText;
    }

    await enqueue(
      telegramQueue,
      'post',
      `list-${bareTag.name}-${uuidv4()}`,
      {
        imageUrl:
          text.length < 1024
            ? await getRecentTagCover(trx, bareTag.name)
            : undefined,
        // Header
        text,
      } satisfies TelegramPost,
      100,
    );

    return { status: 'success', changes: lines.length };
  });
}
