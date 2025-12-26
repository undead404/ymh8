import type { Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import * as v from 'valibot';

import { enqueue, internalQueue, telegramQueue } from '@ymh8/queues';
import { bareTagSchema, type TelegramPost } from '@ymh8/schemata';
import kysely from '../database2/index.js';
import saveAlbumScrapeSuccess from '../database2/save-tag-scrape-success.js';

export default function finishTagScrape(job: Job<unknown>) {
  const bareTag = v.parse(bareTagSchema, job.data);

  return kysely.transaction().execute(async (trx) => {
    await saveAlbumScrapeSuccess(trx, bareTag.name);

    const text = `Зібрано альбоми для тега ${bareTag.name}`;
    await enqueue(telegramQueue, 'post', `list-${bareTag.name}-${uuidv4()}`, {
      text,
    } satisfies TelegramPost);

    await enqueue(
      internalQueue,
      'tag:list:generate',
      bareTag.name,
      bareTag,
      100,
    );
  });
}
