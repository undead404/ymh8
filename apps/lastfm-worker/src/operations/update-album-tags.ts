import type { Job } from 'bullmq';
import * as v from 'valibot';

import { hideAlbum } from '@ymh8/database';
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
  job: Job<unknown>,
): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, job.data);
  return kysely.transaction().execute(async (transaction) => {
    try {
      let tags = await getAlbumTags(bareAlbum, job);
      tags = [...normalizeTags(filterTags(tags))];
      if (tags.length === 0) {
        await sleep(1100);
        tags = await getArtistTags(bareAlbum, job);
        tags = [...normalizeTags(filterTags(tags))];
      }
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

      await saveAlbumTagsUpdateSuccess(transaction, bareAlbum);
      return tagsToUpdate.length > 0
        ? Object.fromEntries(
            tagsToUpdate.map(({ name, count }) => [name, count]),
          )
        : {
            status: 'no_update',
          };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Album not found')) {
        await hideAlbum(transaction, bareAlbum);
        return { status: 'not_found_in_api' };
      }
      throw error;
    }
  });
}
