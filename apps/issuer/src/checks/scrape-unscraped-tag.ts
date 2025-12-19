import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, lastfmQueue } from '@ymh8/queues';
import findUnscrapedTag from '../database2/find-unscraped-tag.js';
// import pickUnscrapedTag from '../database/pick-unscraped-tag.js';

export default async function scrapeUnscrapedTag(transaction: Transaction<DB>) {
  // const unscrapedTag = await pickUnscrapedTag();
  const unscrapedTag = await findUnscrapedTag(transaction);
  if (!unscrapedTag) {
    return;
  }
  console.log('unscrapedTag', unscrapedTag);
  await enqueue(lastfmQueue, 'tag:scrape', unscrapedTag.name, unscrapedTag);
}
