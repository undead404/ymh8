import type { Job } from 'bullmq';
import * as v from 'valibot';

import { deleteTag } from '@ymh8/database';
import { enqueue, lastfmQueue } from '@ymh8/queues';
import { type BareAlbum, bareTagSchema } from '@ymh8/schemata';
import getOldList from '../database2/get-old-list.js';
import kysely from '../database2/index.js';

export default async function eliminateTag(
  job: Job<unknown>,
): Promise<unknown> {
  const bareTag = v.parse(bareTagSchema, job.data);
  return kysely.transaction().execute(async (trx) => {
    const oldListItems = await getOldList(trx, bareTag.name);
    await deleteTag(trx, bareTag.name);
    for (const listItem of oldListItems) {
      console.log(`${listItem.albumArtist} - ${listItem.albumName}`);
      await enqueue(
        lastfmQueue,
        'album:update:tags',
        `${listItem.albumArtist} - ${listItem.albumName}`,
        {
          artist: listItem.albumArtist,
          name: listItem.albumName,
        } satisfies BareAlbum,
        1,
      );
    }
  });
}
