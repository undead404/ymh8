import * as v from 'valibot';

import { enqueue, internalQueue } from '@ymh8/queues';
import { bareTagSchema } from '@ymh8/schemata';
import kysely from '../database2/index.js';
import saveAlbumScrapeSuccess from '../database2/save-tag-scrape-success.js';

export default function finishTagScrape(jobData: unknown) {
  const bareTag = v.parse(bareTagSchema, jobData);

  return kysely.transaction().execute(async (trx) => {
    await saveAlbumScrapeSuccess(trx, bareTag.name);

    await enqueue(
      internalQueue,
      'tag:list:generate',
      bareTag.name,
      bareTag,
      100,
    );
  });
}
