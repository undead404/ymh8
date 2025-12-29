import type { Job } from 'bullmq';
import * as v from 'valibot';

import { bareAlbumSchema } from '@ymh8/schemata';
import kysely from '../database2/index.js';
import saveLink from '../database2/save-link.js';
import searchLink from '../itunes/search-link.js';

import saveCheckSuccess from './save-check-success.js';

export default async function scrapeLink(job: Job<unknown>) {
  const album = v.parse(bareAlbumSchema, job.data);
  return kysely.transaction().execute(async (trx) => {
    const found = await searchLink(album, job);
    if (!found) {
      await saveCheckSuccess(trx, album);
      return { status: 'not_found' };
    }
    const update = {
      pageUrl: found.pageUrl,
      url: found.previewUrl,
    };
    await saveLink(trx, album, update);
    await saveCheckSuccess(trx, album);
    return update;
  });
}
