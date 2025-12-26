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

// Helper to create unique signature
const getSig = (artist: string, name: string) => `${artist} - ${name}`;

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
    let hasDatabaseChanges = false;

    // We need strict sets for logic
    const oldMap = new Map(
      oldList.map((oldListItem) => [
        getSig(oldListItem.albumArtist, oldListItem.albumName),
        oldListItem,
      ]),
    );
    const newMap = new Map(
      tagListItems.map((newListItem) => [
        getSig(newListItem.albumArtist, newListItem.albumName),
        newListItem,
      ]),
    );

    if (oldList.length === 0) {
      await insertNewListItems(trx, bareTag.name, tagListItems);
      hasDatabaseChanges = true;
    } else {
      for (const newItem of tagListItems) {
        const oldSamePlaceAlbum = oldList.find(
          ({ place }) => place === newItem.place,
        );

        if (!oldSamePlaceAlbum) {
          // It's new to the DB
          await insertNewListItems(trx, bareTag.name, [newItem]);
          hasDatabaseChanges = true;
        } else if (
          newItem.albumArtist !== oldSamePlaceAlbum.albumArtist &&
          newItem.albumName !== oldSamePlaceAlbum.albumName
        ) {
          // Position changed (we update DB regardless of whether it's "noise")
          await updateTagListItem(trx, bareTag.name, newItem);
          hasDatabaseChanges = true;
        }
      }
    }

    if (!hasDatabaseChanges) {
      await saveNoListChange(trx, bareTag.name);
      return { status: 'no_change' };
    }

    await saveTagListSuccess(trx, bareTag.name);

    // --- ENRICHMENT QUEUE (Only for truly new albums) ---
    const trulyNewItems = tagListItems.filter(
      (index) => !oldMap.has(getSig(index.albumArtist, index.albumName)),
    );

    if (trulyNewItems.length > 0) {
      await Promise.all(
        trulyNewItems.map((item) =>
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
    // 1. Calculate dropouts (Left the chart)
    const dropouts = oldList.filter(
      (old) => !newMap.has(getSig(old.albumArtist, old.albumName)),
    );

    // 2. Build the output lines
    const lines: string[] = [];

    // Iterate through the NEW list to maintain rank order
    for (const [newIndex, newItem] of tagListItems.entries()) {
      const sig = getSig(newItem.albumArtist, newItem.albumName);
      const oldItem = oldMap.get(sig);

      if (oldItem) {
        // CASE: Existing Item - Did it move meaningfully?
        const oldIndex = oldList.indexOf(oldItem);
        if (oldIndex === -1) {
          throw new Error('Makes no sense');
        }
        const oldNeighborAbove = oldList.at(oldIndex - 1);
        const newNeighborAbove = tagListItems.at(newIndex - 1);
        const oldNeighborBelow = oldList.at(oldIndex + 1);
        const newNeighborBelow = tagListItems.at(newIndex + 1);
        const oldAboveSig = getSig(
          oldNeighborAbove?.albumArtist || '',
          oldNeighborAbove?.albumName || '',
        );
        const newAboveSig = getSig(
          newNeighborAbove?.albumArtist || '',
          newNeighborAbove?.albumName || '',
        );
        const oldBelowSig = getSig(
          oldNeighborBelow?.albumArtist || '',
          oldNeighborBelow?.albumName || '',
        );
        const newBelowSig = getSig(
          newNeighborBelow?.albumArtist || '',
          newNeighborBelow?.albumName || '',
        );
        if (oldAboveSig === newAboveSig && oldBelowSig === newBelowSig) {
          // await job.log(
          //   'SKIPPED ' + getSig(newItem.albumArtist, newItem.albumName),
          // );
          if (lines.at(-1) !== '…') {
            lines.push('…');
          }
          continue;
        } else {
          // if (oldAboveSig !== newAboveSig) {
          //   await job.log(`Above: ${oldAboveSig} !== ${newAboveSig}`);
          // }
          // if (oldBelowSig !== newBelowSig) {
          //   await job.log(`Below: ${oldBelowSig} !== ${newBelowSig}`);
          // }
        }

        // // Calculate "Gravity":
        // // How many items strictly ABOVE this item in the OLD list are now GONE?
        // const deletionsAbove = oldList.filter(
        //   (o) =>
        //     o.place < oldItem.place &&
        //     !newMap.has(getSig(o.albumArtist, o.albumName)),
        // ).length;

        // // How many items strictly ABOVE this item in the NEW list are NEW ENTRIES?
        // const insertionsAbove = tagListItems.filter(
        //   (n) =>
        //     n.place < newItem.place &&
        //     !oldMap.has(getSig(n.albumArtist, n.albumName)),
        // ).length;

        // // The "Expected" Rank if it just floated passively
        // const expectedRank = oldItem.place + insertionsAbove - deletionsAbove;

        // if (newItem.place !== expectedRank) {
        //   // It defied gravity! It actively climbed or fell.
        const diff = oldItem.place - newItem.place; // Positive = climbed up
        if (diff === 0) {
          continue;
        }
        const arrow = diff > 0 ? '⬆️' : '⬇️';
        lines.push(
          `${arrow} <b>#${newItem.place}</b> ${escapeForTelegram(`${newItem.albumArtist} - ${newItem.albumName}`)} (було #${oldItem.place})`,
        );
        // }
        // If place === expectedRank, we hide it. It's just shifting naturally.
      } else {
        // CASE: New Entry
        lines.push(
          `➕ <b>#${newItem.place}</b> ${escapeForTelegram(`${newItem.albumArtist} - ${newItem.albumName}`)}`,
        );
      }
    }

    // 3. Append Dropouts at the bottom
    if (dropouts.length > 0) {
      lines.push('', '<b>📉 Вибули:</b>');
      for (const d of dropouts) {
        lines.push(
          `❌ ${escapeForTelegram(`${d.albumArtist} - ${d.albumName}`)}`,
        );
      }
    }

    // If "lines" is empty (rare, but possible if only swaps happened in a way that matches shifts), fallback
    if (lines.length === 0) {
      lines.push('⚠️ Список змінився незначно.');
    }

    let text = `${oldList.length === 0 ? '🆕 Новий' : '🔄 Оновлений'} список для ${escapeForTelegram(bareTag.name)}:

`;

    for (const line of lines) {
      const nextText = `${text}\n${line}`;
      if (nextText.length > 4095) {
        if (text.length < 4094) {
          text = `${text}\n…`;
        }
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
